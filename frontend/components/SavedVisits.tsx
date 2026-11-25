import {useCallback, useEffect, useState} from 'react';
import {getSubmissions} from "@/services/submissions";
import {FlatList, StyleSheet, Text, View} from "react-native";
import {getDb} from "@/services/db";
import {listQueuedVisits } from "@/services/queue";
import VisitCard, {VisitCardInfo} from "@/components/VisitCard";
import Separator from "@/components/Separator";
import {SegmentedButton, Tab} from "@/components/SegmentedButton";
import {getSite} from "@/services/sites";
import {parseISO} from "date-fns";
import { toCardInfo } from "@/lib/visitCardInfo";

export default function SavedVisits({ username }: { username: string | null }) {
  const [pending, setPending] = useState<VisitCardInfo[]>([]);
  const [failed, setFailed] = useState<VisitCardInfo[]>([])
  const [completed, setCompleted] = useState<VisitCardInfo[]>([]);
  const [tab, setTab] = useState<Tab>("pending");

const loadQueued = useCallback(async () => {
  if (username === null) {
    setPending([]);
    setFailed([]);
    return;
  }

  const db = await getDb();
  const [queued, failed] = await Promise.all([
    listQueuedVisits(db, username, "queued"),
    listQueuedVisits(db, username, "failed"),
  ]);

  setPending(queued.map(toCardInfo));
  setFailed(failed.map(toCardInfo));
}, [username]);

const loadCompleted = useCallback(async () => {
  const submissions = await getSubmissions();

  const siteIds = [...new Set(submissions.map((s) => s.site))];
  const sites = await Promise.all(siteIds.map((id) => getSite(id)));
  const siteById = new Map(sites.map((s) => [s.id, s]));

  const result: VisitCardInfo[] = submissions.flatMap((submission) => {
    const site = siteById.get(submission.site);
    if (!site) return [];

    return [
      {
        uuid: submission.uuid,
        recordedAt: parseISO(submission.created_at),
        status: "sent" as const,
        siteName: site.name,
        address: site.address,
      },
    ];
  });

  setCompleted(result);
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
            data={pending}
            keyExtractor={(item) => item.uuid}
            renderItem={({ item }) => (
              <VisitCard visit={item} />
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
            data={completed}
            keyExtractor={(item) => item.uuid}
            renderItem={({ item }) => (
              <VisitCard visit={item} />
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
