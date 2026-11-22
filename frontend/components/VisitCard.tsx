import {StyleSheet, Text, View} from "react-native";
import {QueuedVisit} from "@/services/queue";
import {SubmissionBody} from "@/types/form";

export default function VisitCard({ item } : {item: SubmissionBody}) {
  return <View style={styles.item}>
    <Text style={styles.siteHeading}>Site #{item.site}</Text>

    {Object.entries(item.metadata).map(([key, value]) => (
      <View key={key} style={styles.metadata}>
        <Text><Text style={styles.label}>{key}</Text>: {String(value)}</Text>
      </View>
    ))}
  </View>
}

const styles = StyleSheet.create({
  siteHeading: {
    fontSize: 18,
    fontWeight: "600",
  },
  item: {
    paddingVertical: 16,
  },
  metadata: {
    flexDirection: "row",
    gap: "5"
  },
  label: {
    fontWeight: 600,
  },
});
