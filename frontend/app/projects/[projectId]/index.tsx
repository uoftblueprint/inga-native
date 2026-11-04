import { FlatList, Pressable, StyleSheet, Text } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSites } from "@/hooks/useForm";

export default function SitePicker() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const router = useRouter();
  const { data } = useSites(Number(projectId));

  return (
    <FlatList
      data={data}
      keyExtractor={(s) => String(s.id)}
      contentContainerStyle={styles.container}
      ListEmptyComponent={<Text>No sites.</Text>}
      renderItem={({ item }) => (
        <Pressable
          style={styles.row}
          onPress={() => router.push(`/projects/${projectId}/sites/${item.id}`)}
        >
          <Text>{item.name}</Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  row: { padding: 16 },
});