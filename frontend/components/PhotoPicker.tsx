import { useState } from "react";
import {ActivityIndicator, Alert, Button, Image, Linking, StyleSheet, Text, View,} from "react-native";

import { uploadPhoto } from "@/services/photoUpload";
import { type PhotoResult, pickPhoto, resizePhoto, takePhoto } from "@/services/photos";

type UploadStatus =
  | { status: "uploading" }
  | { status: "done" }
  | { status: "error"; message: string };

// One entry per photo. `uri` is the resized file and doubles as the unique key.
type PhotoItem = { uri: string; upload: UploadStatus };

function showProblem(result: PhotoResult, what: string) {
  if (result.status === "denied") {
    Alert.alert(
      `${what} access needed`,
      `Inga needs ${what.toLowerCase()} access to add photos.`,
      result.canAskAgain
        ? [{ text: "OK" }]
        : [
            { text: "Cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() },
          ],
    );
  } else if (result.status === "unavailable") {
    Alert.alert(
      "Camera unavailable",
      "This device has no camera. Try picking from your library.",
    );
  }
  // "cancelled" needs no message
}

export default function PhotoPicker() {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [working, setWorking] = useState(false);

  // Replaces one photo's upload status. The function form of setPhotos
  // matters because several updates can arrive close together.
  function setUpload(uri: string, upload: UploadStatus) {
    setPhotos((current) =>
      current.map((photo) => (photo.uri === uri ? { ...photo, upload } : photo)),
    );
  }

  async function uploadOne(uri: string) {
    setUpload(uri, { status: "uploading" });
    try {
      await uploadPhoto(uri);
      setUpload(uri, { status: "done" });
    } catch (error) {
      setUpload(uri, {
        status: "error",
        message: error instanceof Error ? error.message : "Upload failed",
      });
    }
  }

  async function handlePick(pick: () => Promise<PhotoResult>, what: string) {
    const result = await pick();
    if (result.status !== "success") {
      showProblem(result, what);
      return;
    }

    setWorking(true);
    let failed = 0;
    try {
      // One photo at a time: each is resized, then uploaded on its own.
      for (const asset of result.assets) {
        try {
          const resized = await resizePhoto(asset);
          setPhotos((current) => [
            ...current,
            { uri: resized.uri, upload: { status: "uploading" } },
          ]);
          await uploadOne(resized.uri);
        } catch {
          failed++; // resizing failed; keep going with the rest
        }
      }
    } finally {
      setWorking(false);
    }

    if (failed > 0) {
      Alert.alert(
        "Couldn't process photo",
        failed === 1
          ? "Please try again."
          : `${failed} photos couldn't be processed. Please try again.`,
      );
    }
  }

  return (
    <View style={styles.container}>
      <Button
        title="Take photo"
        disabled={working}
        onPress={() => handlePick(takePhoto, "Camera")}
      />
      <Button
        title="Choose from library"
        disabled={working}
        onPress={() => handlePick(pickPhoto, "Photo library")}
      />

      <View style={styles.grid}>
        {photos.map((photo) => (
          <View key={photo.uri} style={styles.item}>
            <Image source={{ uri: photo.uri }} style={styles.preview} />
            {photo.upload.status === "uploading" ? (
              <View style={styles.row}>
                <ActivityIndicator />
                <Text>Uploading...</Text>
              </View>
            ) : null}
            {photo.upload.status === "done" ? <Text>Uploaded</Text> : null}
            {photo.upload.status === "error" ? (
              <>
                <Text style={styles.error}>{photo.upload.message}</Text>
                <Button title="Retry" onPress={() => uploadOne(photo.uri)} />
              </>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", gap: 12 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
  },
  item: { alignItems: "center", gap: 6, width: 120 },
  preview: { width: 100, height: 100, borderRadius: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  error: { color: "#8b1e1e", textAlign: "center" },
});