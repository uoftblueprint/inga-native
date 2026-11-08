import {
  ActivityIndicator,
  Button,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSites } from "@/hooks/useForm";

export default function SitePicker() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const router = useRouter();
  const { data, isPending, isError, refetch } = useSites(Number(projectId));

  if (isPending) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.center}>
        <Text>Could not load sites.</Text>
        <Button title="Retry" onPress={refetch} />
      </View>
    );
  }

  return (
    <FlatList
      data={data}
      keyExtractor={(s) => String(s.id)}
      contentContainerStyle={styles.container}
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

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: "center", alignItems: "center" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});