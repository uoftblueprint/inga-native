import type { ImagePickerAsset } from "expo-image-picker";
import { useState } from "react";
import { Alert, Button, Image, Linking, StyleSheet, View } from "react-native";

import { takePhoto } from "@/services/photos";

export default function PhotoPicker() {
  const [photo, setPhoto] = useState<ImagePickerAsset | null>(null);

  async function handleTakePhoto() {
    const result = await takePhoto();

    if (result.status === "success") {
      setPhoto(result.asset);
    } else if (result.status === "denied") {
      Alert.alert(
        "Camera access needed",
        "Inga needs the camera to take photos at the farm.",
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
        "This device has no camera. Try picking from your gallery.",
      );
    }
    // "cancelled" needs no message
  }

  return (
    <View style={styles.container}>
      <Button title="Take photo" onPress={handleTakePhoto} />
      {photo ? (
        <Image source={{ uri: photo.uri }} style={styles.preview} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 12,
  },
  preview: {
    width: 200,
    height: 200,
    borderRadius: 8,
  },
});