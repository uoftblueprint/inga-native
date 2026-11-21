import { useEffect } from "react";
import {
  ActivityIndicator,
  Button,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useProjects } from "@/hooks/useForm";
import { loadErrorMessage } from "@/lib/loadErrorMessage";

// "Choose a programme" screen. Skipped entirely when there is only one
// active programme: the worker goes straight to its farms.
export default function ProjectPicker() {
  const router = useRouter();
  const { data: projects, isPending, isError, error, refetch } = useProjects();

  const onlyProject = projects?.length === 1 ? projects[0] : null;

  // Skip this screen when there's only one programme. `replace` (not `push`)
  // swaps this screen out, so Back from the farm list doesn't land here and
  // bounce straight back.
  useEffect(() => {
    if (onlyProject) {
      router.replace(`/projects/${onlyProject.id}`);
    }
  }, [onlyProject, router]);

  // Loading, or about to skip to the only programme
  if ((isPending && projects === undefined) || onlyProject) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.message}>Loading programmes…</Text>
      </View>
    );
  }

  // Couldn't load, and there's no list at all
  if (isError && projects === undefined) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Couldn&apos;t load programmes</Text>
        <Text style={styles.message}>{loadErrorMessage(error, "programme list")}</Text>
        <Button title="Try again" onPress={refetch} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Choose a programme</Text>

      <FlatList
        data={projects}
        keyExtractor={(project) => String(project.id)}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => router.push(`/projects/${item.id}`)}
            accessibilityRole="button"
          >
            <Text style={styles.rowText}>{item.name}</Text>
          </Pressable>
        )}
        // Pull down to refresh
        refreshing={isPending && projects !== undefined}
        onRefresh={refetch}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.message}>No active programmes yet.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 12 },
  list: { flexGrow: 1 },
  row: {
    minHeight: 56, // big enough to tap easily
    justifyContent: "center",
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  rowText: { fontSize: 16, fontWeight: "600" },
  message: { textAlign: "center", color: "#555", marginTop: 12 },
  errorTitle: { fontSize: 18, fontWeight: "700", textAlign: "center" },
});

