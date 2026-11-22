import { Pressable, StyleSheet, Text, View } from "react-native";

export type Tab = "pending" | "completed";

type Props = {
  value: Tab;
  onChange: (tab: Tab) => void;
};

const OPTIONS: { key: Tab; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "completed", label: "Completed" },
];

export function SegmentedButton({ value, onChange }: Props) {
  return (
    <View style={styles.container}>
      {OPTIONS.map(({ key, label }) => {
        const active = value === key;
        return (
          <Pressable
            key={key}
            onPress={() => onChange(key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={[styles.segment, active && styles.segmentActive]}
          >
            <Text
              style={[styles.label, active && styles.labelActive]}
              numberOfLines={1}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    padding: 6,
    // iOS shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    // Android shadow
    elevation: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentActive: {
    backgroundColor: "#5d8372", // muted dark green
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  labelActive: {
    color: "#FFFFFF",
  },
});