import { FlatList, Pressable, Text } from "react-native";
import { useRouter } from "expo-router";
import { useProjects } from "@/hooks/useForm";

export default function ProjectPicker() {
  const router = useRouter();
  const { data } = useProjects();

  return (
    <FlatList
      data={data}
      keyExtractor={(p) => String(p.id)}
      ListEmptyComponent={<Text>No projects.</Text>}
      renderItem={({ item }) => (
        <Pressable onPress={() => router.push(`/projects/${item.id}`)}>
          <Text>{item.name}</Text>
        </Pressable>
      )}
    />
  );
}