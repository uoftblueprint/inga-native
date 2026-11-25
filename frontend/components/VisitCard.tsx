import {StyleSheet, Text, View} from "react-native";
import {formatDistanceToNow} from "date-fns";

const STATUS_DISPLAY: Record<
  QueuedVisitStatus,
  { label: string | null; tone: "warning" | "error" | "success" }
> = {
  queued: { label: "Saved on this phone", tone: "warning" },
  sending: { label: "Sending…", tone: "warning" },
  failed: { label: "Send failed", tone: "error" },
  sent: { label: null, tone: "success" },
};

export type VisitCardInfo = {
  uuid: string;
  recordedAt: Date;
  status: QueuedVisitStatus;
  siteName: string;
  address: string;
  lastError?: string | null;
};

export default function VisitCard(
  {visit}: {visit: VisitCardInfo}
) {
  const status = STATUS_DISPLAY[visit.status];

  return (
    <View style={styles.container}>
      <View style={styles.dateContainer}>
        <Text style={styles.dateText}>{visit.recordedAt.toDateString()}</Text>
        <Text style={styles.dateText}>
          {formatDistanceToNow(visit.recordedAt, { addSuffix: true })}
        </Text>
      </View>
      <View style={styles.headingContainer}>
        <Text style={styles.heading}>{visit.siteName}</Text>
        {status.label && (
          <Text style={[styles.statusText, styles[status.tone]]}>
            {status.label}
          </Text>
        )}
      </View>
      <Text>{visit.address}</Text>
      {visit.status === "failed" && visit.lastError && (
        <Text style={styles.error}>{visit.lastError}</Text>
      )}
      {/*{Object.entries(visit.submission.metadata).map(([key, value]) => (*/}
      {/*  <View key={key} style={styles.metadata}>*/}
      {/*    <Text><Text style={styles.label}>{key}</Text>: {String(value)}</Text>*/}
      {/*  </View>*/}
      {/*))}*/}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    gap: 6,
  },
  dateContainer: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dateText: {
    color: "#777"
  },
  headingContainer: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusText: {
    fontWeight: "600",
  },
  error: {
    color: "#ff0000",
  },
  warning: {
    color: "#ff790c",
  },
  heading: {
    fontSize: 18,
    fontWeight: "600",
    marginVertical: 3,
  },
  metadata: {
    flexDirection: "row",
    gap: 5,
  },
  label: {
    fontWeight: "600",
  },
});
