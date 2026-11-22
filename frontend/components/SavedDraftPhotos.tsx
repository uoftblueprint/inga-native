import { Image, StyleSheet, Text, View } from "react-native";

import type { DraftPhoto } from "@/types/drafts";

type Props = {
  photos: DraftPhoto[];
};

export function SavedDraftPhotos({ photos }: Props) {
  if (!photos.length) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Saved photos</Text>
      <View style={styles.grid}>
        {photos.map((photo) => (
          <Image
            key={photo.client_photo_id}
            source={{ uri: photo.local_path }}
            style={styles.preview}
            accessibilityLabel="Saved visit photo"
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", gap: 8 },
  title: { fontSize: 18, fontWeight: "600", marginTop: 12 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
  },
  preview: { width: 100, height: 100, borderRadius: 8 },
});
