import {useCallback, useEffect, useState} from 'react';
import {getSubmissions} from "@/services/submissions";
import {Button, FlatList, StyleSheet, Text, View} from "react-native";
import {getDb} from "@/services/db";
import {enqueueDraft, listQueuedVisits, QueuedVisit} from "@/services/queue";
import VisitCard, {VisitCardInfo} from "@/components/VisitCard";
import Separator from "@/components/Separator";
import {SegmentedButton, Tab} from "@/components/SegmentedButton";
import {getSite} from "@/services/sites";
import {compareDesc, parseISO} from "date-fns";
import { toCardInfo } from "@/lib/visitCardInfo";
import {createDraft} from "@/services/drafts";
import {saveSupplyItems} from "@/services/catalogue";

function SavedVisits({username}: { username: string | null }) {
  const [pending, setPending] = useState<VisitCardInfo[]>([]);
  // not shown in UI currently
  const [failed, setFailed] = useState<VisitCardInfo[]>([]);
  const [completed, setCompleted] = useState<VisitCardInfo[]>([]);
  const [tab, setTab] = useState<Tab>("pending");

  // for testing
  async function addVisit() {
    const db = await getDb();
    const SEEDS = {
      id: 1,
      name: "Inga seeds",
      category: "seeds",
      unit: "kg",
      quantity_kind: "measure" as const,
    };
    const SAPLINGS = {
      id: 2,
      name: "Inga saplings",
      category: "saplings",
      unit: "plants",
      quantity_kind: "count" as const,
    };

    if (username != null) {
      const draft = await createDraft(db, username, {
        project_id: 1,
        site_id: 1,
        deliveries: [{item: 1, quantity: "2.5"}],
        metadata: {"Soil tested": true},
      })
      await saveSupplyItems(db, username, [SEEDS, SAPLINGS])
      await enqueueDraft(db, username, draft.uuid);
    }
  }

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

    const byMostRecent = (a: QueuedVisit, b: QueuedVisit) =>
      compareDesc(parseISO(a.request.recorded_at), parseISO(b.request.recorded_at));

    queued.sort(byMostRecent);
    failed.sort(byMostRecent);

    const [newPending, newFailed] = await Promise.all([
      Promise.all(queued.map(toCardInfo)),
      Promise.all(failed.map(toCardInfo)),
    ]);
    setPending(newPending);
    setFailed(newFailed);
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

    result.sort((a,b) => compareDesc(a.recordedAt, b.recordedAt))
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
      <Button title="add pending visit" onPress={addVisit}></Button>
      <Text style={styles.title}>Saved visits</Text>

      <SegmentedButton value={tab} onChange={handleTabChange}/>

      {
        tab === "pending" ? (
          <FlatList
            style={styles.list}
            contentContainerStyle={styles.contentContainer}
            data={pending}
            keyExtractor={(item) => item.uuid}
            renderItem={({item}) => (
              <VisitCard visit={item}/>
            )}
            ItemSeparatorComponent={() => (<Separator/>)}
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
            renderItem={({item}) => (
              <VisitCard visit={item}/>
            )}
            ItemSeparatorComponent={() => (<Separator/>)}
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

export default SavedVisits

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
