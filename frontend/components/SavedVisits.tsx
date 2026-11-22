import {useCallback, useEffect, useState} from 'react';
import {getSubmissions} from "@/services/submissions";
import {View, Text, FlatList, StyleSheet} from "react-native";
import {SubmissionBody} from "@/types/form";
import {getDb} from "@/services/db";
import {listQueuedVisits, QueuedVisit} from "@/services/queue";
import CompletedVisit from "@/components/CompletedVisit";
import Separator from "@/components/Separator";
import {SegmentedButton, Tab} from "@/components/SegmentedButton";
import PendingVisit from "./PendingVisit";

export default function SavedVisits({ username }: { username: string | null }) {
  const [pending, setPending] = useState<QueuedVisit[]>([]);
  const [failed, setFailed] = useState<QueuedVisit[]>([])
  const [completed, setCompleted] = useState<SubmissionBody[]>([]);
  const [tab, setTab] = useState<Tab>("pending");

  const loadQueued = useCallback(async () => {
    if (username === null) {
      return [];
    }
    const db = await getDb();
    const workerId = username;
    const pending = await listQueuedVisits(db, workerId, "queued");
    const failed = await listQueuedVisits(db, workerId, "failed");
    setPending(pending);
    setFailed(failed);
  }, [username])

  const loadCompleted = useCallback(async () => {
    let res: SubmissionBody[];
    res = await getSubmissions();
    setCompleted(res);
  }, []);

  useEffect(() => {
    loadQueued();
    loadCompleted();
  }, [loadQueued, loadCompleted]);

  function handleTabChange(next: Tab) {
    if (next === tab) {
      return
    } else {
      setTab(next);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Saved visits</Text>

      <SegmentedButton value={tab} onChange={handleTabChange} />

      {
        tab === "pending" ? (
          <FlatList
            style={styles.list}
            contentContainerStyle={styles.contentContainer}
            // contentContainerStyle={pending.length === 0 ? styles.emptyContainer : undefined}
            data={pending}
            keyExtractor={(item) => item.uuid}
            renderItem={({ item }) => (
              <PendingVisit item={item} />
            )}
            ItemSeparatorComponent={() => (<Separator />)}
            ListEmptyComponent={
              <View style={styles.noItems}>
                <Text>No pending visits found.</Text>
              </View>
            }
            showsVerticalScrollIndicator={true}
            indicatorStyle="black"
          />
        ) : (
          <FlatList
            style={styles.list}
            contentContainerStyle={styles.contentContainer}
            // contentContainerStyle={completed.length === 0 ? styles.emptyContainer : undefined}
            data={completed}
            keyExtractor={(item) => item.uuid}
            renderItem={({ item }) => (
              <CompletedVisit item={item} />
            )}
            ItemSeparatorComponent={() => (<Separator />)}
            ListEmptyComponent={
              <View style={styles.noItems}>
                <Text>No completed visits found.</Text>
              </View>
            }
            showsVerticalScrollIndicator={true}
            indicatorStyle="black"
          />
        )
      }
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    alignSelf: "center",
    paddingBottom: 12,
  },
  list: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
  noItems: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
