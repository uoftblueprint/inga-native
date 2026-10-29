import { useState } from "react";
import { Alert, Button, Image, Linking, StyleSheet, Text, View } from "react-native";

import { type PhotoResult, pickPhoto, resizePhoto, takePhoto } from "@/services/photos";
import { uploadPhoto } from "@/services/photoUpload";

type UploadState =
  | { status: "idle" }
  | { status: "uploading"; progress: number }
  | { status: "done" }
  | { status: "error"; message: string };

// When trying to access camera or gallery fails:
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
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [upload, setUpload] = useState<UploadState>({ status: "idle" });

  async function startUpload(uri: string) {
    setUpload({ status: "uploading", progress: 0 });
    try {
      await uploadPhoto(uri, (progress) =>
        setUpload({ status: "uploading", progress }),
      );
      setUpload({ status: "done" });
    } catch (error) {
      setUpload({
        status: "error",
        message: error instanceof Error ? error.message : "Upload failed",
      });
    }
  }

  async function handlePick(
    pick: () => Promise<PhotoResult>,
    what: string,
  ) {
    const result = await pick();
    if (result.status !== "success") {
      showProblem(result, what);
      return;
    }

    try {
      const resized = await resizePhoto(result.asset);
      setPhotoUri(resized.uri);
      await startUpload(resized.uri);
    } catch {
      Alert.alert("Couldn't process photo", "Please try again.");
    }
  }

  const busy = upload.status === "uploading";

  return (
    <View style={styles.container}>
      <Button title="Take photo" disabled={busy} onPress={() => handlePick(takePhoto, "Camera")} />
      <Button title="Choose from library" disabled={busy} onPress={() => handlePick(pickPhoto, "Photo library")} />

      {photoUri ? <Image source={{ uri: photoUri }} style={styles.preview} /> : null}

      {upload.status === "uploading" ? (
        <View style={styles.track}>
          {/* upload progress bar */}
          <View style={[styles.bar, { width: `${Math.round(upload.progress * 100)}%` }]} />
        </View>
      ) : null}
      {upload.status === "done" ? <Text>Uploaded</Text> : null}
      {upload.status === "error" ? (
        <>
          <Text style={styles.error}>{upload.message}</Text>
          {photoUri ? (
            <Button title="Retry upload" onPress={() => startUpload(photoUri)} />
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", gap: 12 },
  preview: { width: 200, height: 200, borderRadius: 8 },
  track: { width: 200, height: 8, borderRadius: 4, backgroundColor: "#e0e0e0", overflow: "hidden" },
  bar: { height: 8, backgroundColor: "#208AEF" },
  error: { color: "#8b1e1e", textAlign: "center" },
});