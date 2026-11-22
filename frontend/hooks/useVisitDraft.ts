import { useEffect, useRef, useState } from "react";
import { SUPPLY_ITEMS } from "@/mocks/supplies";
import { apiFetch } from "@/services/api";
import { loadSupplyItems, type SupplyItem } from "@/services/catalogue";
import { getDb } from "@/services/db";
import {
  createDraft,
  discardDraft,
  listDrafts,
  saveDraft,
} from "@/services/drafts";
import type { DeliveryRow } from "@/lib/deliveries";
import type { Draft, DraftData, DraftPhoto } from "@/types/drafts";
import type { LogSchema } from "@/types/form";

export function useVisitDraft(
  projectId: number,
  siteId: number,
  liveSchema: LogSchema,
) {
  // Numeric account ID from /api/accounts/me/, not the username.
  const [workerId, setWorkerId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [ready, setReady] = useState(false);
  const [values, setValues] = useState<Record<string, string | boolean | null>>({});
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([]);
  const [photos, setPhotos] = useState<DraftPhoto[]>([]);
  const [catalogue, setCatalogue] = useState<SupplyItem[]>(SUPPLY_ITEMS);
  const [banner, setBanner] = useState<string | null>(null);
  const saving = useRef(false);

  useEffect(() => {
    let cancelled = false;
    apiFetch("/api/accounts/me/")
      .then((response) =>
        response.ok
          ? response.json()
          : Promise.reject(new Error("Could not load worker identity.")),
      )
      .then((account: { id: number }) => {
        if (cancelled) return;
        if (!Number.isInteger(account.id)) {
          setBanner("Could not load worker identity.");
          setWorkerId(null);
          return;
        }
        setWorkerId(account.id);
      })
      .catch(() => {
        if (!cancelled) {
          setBanner("Could not load worker identity.");
          setWorkerId(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!workerId) return;
    let cancelled = false;

    async function restoreOrCreate() {
      try {
        const db = await getDb();
        const sqliteWorkerId = String(workerId);
        const liveItems = await loadSupplyItems(db, sqliteWorkerId);
        const storedDraft =
          (await listDrafts(db, sqliteWorkerId)).find(
            (item) =>
              item.data.project_id === projectId &&
              item.data.site_id === siteId,
          ) ?? null;
        const savedDraft: Draft | null = storedDraft
          ? {
              ...storedDraft,
              data: storedDraft.data as DraftData,
            }
          : null;
        const schema = savedDraft?.data.form_definition ?? liveSchema;
        const snapshot = savedDraft?.data.supply_snapshot;

        const itemMap = new Map<number, SupplyItem>();
        for (const item of liveItems.length ? liveItems : SUPPLY_ITEMS) {
          itemMap.set(item.id, item);
        }
        if (snapshot) {
          for (const [id, item] of Object.entries(snapshot)) {
            itemMap.set(Number(id), {
              id: Number(id),
              name: item.name,
              category: "saved",
              unit: item.unit,
              quantity_kind: item.quantity_kind,
            });
          }
        }

        if (cancelled) return;
        setCatalogue(
          Array.from(itemMap.values()).sort((a, b) =>
            a.name.localeCompare(b.name),
          ),
        );
        setPhotos(savedDraft?.photos ?? []);
        setValues(
          (savedDraft?.data.metadata as
            | Record<string, string | boolean | null>
            | undefined) ?? {},
        );
        setDeliveries(
          savedDraft?.data.deliveries?.map((row) => ({
            item: row.item,
            quantity: row.quantity == null ? "" : String(row.quantity),
          })) ?? [{ item: null, quantity: "" }],
        );

        if (savedDraft) {
          setDraft(savedDraft);
        } else {
          const supplySnapshot = Object.fromEntries(
            Array.from(itemMap.values()).map((item) => [
              String(item.id),
              {
                name: item.name,
                unit: item.unit,
                quantity_kind: item.quantity_kind,
              },
            ]),
          );
          const initialData: DraftData = {
            project_id: projectId,
            site_id: siteId,
            deliveries: [{ item: null, quantity: null }],
            metadata: {},
            form_definition: schema,
            supply_snapshot: supplySnapshot,
          };
          const created = await createDraft(db, sqliteWorkerId, initialData);
          if (!cancelled) setDraft({ ...created, data: initialData });
        }
        if (!cancelled) setReady(true);
      } catch (error) {
        if (!cancelled) {
          setBanner(error instanceof Error ? error.message : "Could not open draft.");
        }
      }
    }

    restoreOrCreate();
    return () => {
      cancelled = true;
    };
  }, [workerId, projectId, siteId, liveSchema]);

  useEffect(() => {
    if (!ready || !draft || !workerId) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (saving.current) return;
      saving.current = true;
      try {
        const db = await getDb();
        if (!cancelled) {
          const saved = await saveDraft(db, String(workerId), draft.uuid, {
            ...draft.data,
            project_id: projectId,
            site_id: siteId,
            deliveries: deliveries.map((row) => ({
              item: row.item,
              quantity: row.quantity === "" ? null : row.quantity,
            })),
            metadata: values,
          });
          if (!saved) setBanner("Could not save this unfinished visit.");
        }
      } catch (error) {
        if (!cancelled) {
          setBanner(
            error instanceof Error
              ? `Could not save this unfinished visit: ${error.message}`
              : "Could not save this unfinished visit.",
          );
        }
      } finally {
        saving.current = false;
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [ready, draft, workerId, projectId, siteId, deliveries, values]);

  const schema = draft?.data.form_definition ?? liveSchema;

  function addDelivery() {
    setDeliveries((rows) => [...rows, { item: null, quantity: "" }]);
  }

  function removeDelivery(index: number) {
    setDeliveries((rows) => rows.filter((_, i) => i !== index));
  }

  function changeDelivery(index: number, patch: Partial<DeliveryRow>) {
    setDeliveries((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  async function discard() {
    if (!draft || !workerId) return false;
    try {
      const db = await getDb();
      await discardDraft(db, String(workerId), draft.uuid);
      return true;
    } catch (error) {
      setBanner(error instanceof Error ? error.message : "Could not discard draft.");
      return false;
    }
  }

  async function saveSnapshot(
    deliveriesPayload: { item: number; quantity: number }[],
    metadata: Record<string, unknown>,
  ) {
    if (!draft || !workerId) throw new Error("Draft not ready.");
    const db = await getDb();
    const data: DraftData = {
      ...draft.data,
      project_id: projectId,
      site_id: siteId,
      deliveries: deliveriesPayload,
      metadata,
      form_definition: schema,
      supply_snapshot: Object.fromEntries(
        catalogue.map((item) => [
          String(item.id),
          {
            name: item.name,
            unit: item.unit,
            quantity_kind: item.quantity_kind,
          },
        ]),
      ),
    };
    const saved = await saveDraft(db, String(workerId), draft.uuid, data);
    if (!saved) throw new Error("The unfinished visit no longer exists.");
  }

  return {
    workerId,
    draft,
    ready,
    values,
    setValues,
    deliveries,
    photos,
    catalogue,
    schema,
    banner,
    setBanner,
    addDelivery,
    removeDelivery,
    changeDelivery,
    discard,
    saveSnapshot,
  };
}
