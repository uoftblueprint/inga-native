import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Button,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useProject, useSites } from "@/hooks/useForm";
import { searchSites } from "@/lib/searchSites";
import { FarmCard } from "@/components/FarmCard";
import { loadErrorMessage } from "@/lib/loadErrorMessage";

// "Select a farm" screen: search one programme's farms and pick one to visit.
export default function SitePicker() {
  // The programme id comes from the address, e.g. /projects/3 gives "3"
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const id = Number(projectId);
  const router = useRouter();

  // The programme (for its name) and its farms
  const { data: project } = useProject(id);
  const { data: sites, fromSaved, isPending, isError, error, refetch } = useSites(id);

  // What the worker typed, and which farm they ticked (null = none yet)
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Re-run the search only when the farms or the typed text change
  const results = useMemo(() => searchSites(sites ?? [], search), [sites, search]);

  // First load: nothing to show yet. Later reloads (pull to refresh) keep the
  // list on screen and show the spinner at the top instead.
  const isFirstLoad = isPending && sites === undefined;
  const isRefreshing = isPending && sites !== undefined;

  // Message 1: loading
  if (isFirstLoad) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.message}>Loading farms…</Text>
      </View>
    );
  }

  // Message 2: couldn't load. Only when there is no list at all: if a reload
  // fails, the farms already on screen stay.
  if (isError && sites === undefined) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Couldn&apos;t load farms</Text>
        <Text style={styles.message}>{loadErrorMessage(error, "farm list")}</Text>
        <Button title="Try again" onPress={refetch} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* Keep the selected programme visible */}
      <Text style={styles.programme}>{project?.name}</Text>
      <Text style={styles.title}>Select a farm</Text>

      {/* Search box: every letter typed updates `search`, which re-runs searchSites */}
      <TextInput
        style={styles.search}
        value={search}
        onChangeText={setSearch}
        placeholder="Search by name, address, village or region"
        autoCorrect={false}       // don't "fix" farm names while typing
        autoCapitalize="none"
        clearButtonMode="while-editing" // the ⓧ to clear (iPhone only)
      />

      {/* Only when the list came from the phone's saved copy */}
      {fromSaved && <Text style={styles.notice}>Showing saved farms</Text>}

      {/* The farm list. FlatList only draws the cards on screen, so long lists stay fast */}
      <FlatList
        data={results}
        keyExtractor={(site) => String(site.id)}
        renderItem={({ item }) => (
          <FarmCard
            site={item}
            selected={item.id === selectedId}
            onPress={() => setSelectedId(item.id)}
          />
        )}
        // Pull down to refresh
        refreshing={isRefreshing}
        onRefresh={refetch}
        // Let a tap on a card work while the keyboard is open
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        // Shown only when the list is empty:
        // Message 3: the programme has no farms. Message 4: the search found none.
        ListEmptyComponent={
          <Text style={styles.message}>
            {(sites ?? []).length === 0
              ? "No farms in this programme yet."
              : `No farms match "${search.trim()}".`}
          </Text>
        }
      />

      {/* Greyed out until a farm is ticked; then opens the recording screen for it */}
      <Pressable
        style={[styles.continue, selectedId === null && styles.continueDisabled]}
        disabled={selectedId === null}
        onPress={() => router.push(`/projects/${id}/sites/${selectedId}`)}
      >
        <Text style={styles.continueText}>Continue</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  programme: { fontSize: 14, color: "#555" },
  title: { fontSize: 22, fontWeight: "700", marginVertical: 8 },
  search: {
    borderWidth: 1,
    borderColor: "#999",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  notice: { color: "#8a6d00", marginBottom: 8 },
  list: { flexGrow: 1, paddingBottom: 16 },
  message: { textAlign: "center", color: "#555", marginTop: 24 },
  errorTitle: { fontSize: 18, fontWeight: "700", textAlign: "center" },
  continue: {
    backgroundColor: "#2e7d32",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  continueDisabled: { backgroundColor: "#a5c9a7" },
  continueText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
