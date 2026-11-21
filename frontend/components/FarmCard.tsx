import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Site } from "@/types/form";

// What the screen passes in to each card
type Props = {
  site: Site;            // the farm to show
  selected: boolean;     // true if this is the farm the worker ticked
  onPress: () => void;   // what to do when the card is tapped (the screen selects it)
};

/**
 * One farm in the search results: name, then address / village / region.
 * Lines with no value (no address, no village) are left out entirely, so
 * nothing shows a blank or misleading label.
 */
export function FarmCard({ site, selected, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, selected && styles.cardSelected]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <View style={[styles.check, selected && styles.checkSelected]}>
        {selected && <Text style={styles.checkMark}>✓</Text>}
      </View>

      {/* flex: 1 lets long names wrap instead of running off the screen */}
      <View style={styles.details}>
        <Text style={styles.name}>{site.name}</Text>
        {site.address !== "" && <Text style={styles.line}>{site.address}</Text>}
        {site.village && <Text style={styles.line}>Village: {site.village.name}</Text>}
        <Text style={styles.line}>Region: {site.region.name}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    minHeight: 64, // big enough to tap easily
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  cardSelected: { borderColor: "#2e7d32", borderWidth: 2 },
  check: {
    width: 24,
    height: 24,
    marginRight: 12,
    borderWidth: 2,
    borderColor: "#999",
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  checkSelected: { borderColor: "#2e7d32", backgroundColor: "#2e7d32" },
  checkMark: { color: "#fff", fontWeight: "bold" },
  details: { flex: 1 },
  name: { fontSize: 16, fontWeight: "600", marginBottom: 4 },
  line: { fontSize: 14, color: "#555", marginTop: 2 },
});

