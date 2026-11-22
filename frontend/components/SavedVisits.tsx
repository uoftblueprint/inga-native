import {useCallback, useEffect, useState} from 'react';
import {getSubmissions} from "@/services/submissions";
import {View, Text, FlatList, StyleSheet} from "react-native";
import {SubmissionBody} from "@/types/form";
import {getDb} from "@/services/db";
import {listQueuedVisits, QueuedVisit} from "@/services/queue";
import VisitCard from "@/components/VisitCard";
import Separator from "@/components/Separator";

export default function SavedVisits({ username }: { username: string | null }) {
  const [pending, setPending] = useState<QueuedVisit[]>([]);
  const [failed, setFailed] = useState<QueuedVisit[]>([])
  const [completed, setCompleted] = useState<SubmissionBody[]>([]);

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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Saved visits</Text>

      <FlatList
        style={styles.list}
        data={completed}
        keyExtractor={(item) => item.uuid}
        renderItem={({ item }) => (
          <VisitCard item={item} />
        )}
        ItemSeparatorComponent={() => (<Separator />)}
        ListEmptyComponent={<Text>No saved visits yet.</Text>}
        showsVerticalScrollIndicator={true}
        indicatorStyle="black"
      />
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
  },
  siteHeading: {
    fontSize: 18,
    fontWeight: "600",
  },
  list: {
    flexGrow: 1,
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
