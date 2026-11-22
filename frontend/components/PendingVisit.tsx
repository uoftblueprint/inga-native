import {StyleSheet, Text, View} from "react-native";
import {QueuedVisit} from "@/services/queue";

export default function PendingVisit({ item } : {item: QueuedVisit}) {

  return <View style={styles.container}>
    <Text style={styles.siteHeading}>Site #{item.request.site}</Text>

    {Object.entries(item.request.metadata).map(([key, value]) => (
      <View key={key} style={styles.metadata}>
        <Text><Text style={styles.label}>{key}</Text>: {String(value)}</Text>
      </View>
    ))}
  </View>
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
  },
  siteHeading: {
    fontSize: 18,
    fontWeight: "600",
  },
  metadata: {
    flexDirection: "row",
    gap: "5"
  },
  label: {
    fontWeight: 600,
  },
});
