import { FlatList, Pressable, StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";
import { useProjects } from "@/hooks/useForm";

export default function ProjectPicker() {
  const router = useRouter();
  const { data } = useProjects();

  return (
    <FlatList
      data={data}
      keyExtractor={(p) => String(p.id)}
      contentContainerStyle={styles.container}
      ListEmptyComponent={<Text>No projects.</Text>}
      renderItem={({ item }) => (
        <Pressable
          style={styles.row}
          onPress={() => router.push(`/projects/${item.id}`)}
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