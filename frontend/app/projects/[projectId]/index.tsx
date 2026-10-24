import { FlatList, Pressable, Text } from "react-native";
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
      ListEmptyComponent={<Text>No sites.</Text>}
      renderItem={({ item }) => (
        <Pressable
          onPress={() => router.push(`/projects/${projectId}/sites/${item.id}`)}
        >
          <Text>{item.name}</Text>
        </Pressable>
      )}
    />
  );
}