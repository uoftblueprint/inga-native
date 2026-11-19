import type { SupplyItem } from "@/services/catalogue";
import type { Db } from "@/services/db";
import type { Draft } from "@/services/drafts";

export type QueuedVisitStatus = "queued" | "sending" | "failed" | "sent";

export type VisitRequest = {
  uuid: string;
  site: number;
  recorded_at: string;
  deliveries: { item: number; quantity: number }[];
  metadata: Record<string, unknown>;
  expected_photo_ids: string[];
};

export class EnqueueError extends Error {}

export type EnqueueResult = {
  uuid: string;
  alreadyQueued: boolean;
};

/** Checks one delivery row against the saved supply catalogue. Throws EnqueueError. */
function validateDelivery(
  row: { item: number | null; quantity: string | number | null },
  items: Map<number, SupplyItem>,
): { item: number; quantity: number } {
  if (row.item === null || row.item === undefined) {
    throw new EnqueueError("A delivery row has no item selected");
  }
  const item = items.get(row.item);
  if (!item) throw new EnqueueError(`Unknown supply item ${row.item}`);

  const q =
    typeof row.quantity === "string"
      ? Number(row.quantity.trim())
      : row.quantity;
  if (q === null || q === undefined || !Number.isFinite(q) || q <= 0) {
    throw new EnqueueError(
      `Quantity for "${item.name}" must be a positive number`,
    );
  }
  if (item.quantity_kind === "count" && !Number.isInteger(q)) {
    throw new EnqueueError(
      `Quantity for "${item.name}" must be a whole number`,
    );
  }
  return { item: row.item, quantity: q };
}

/**
 * Turns a draft into a queued visit. Safe to call twice for the same draft:
 * the second call returns the existing queued visit.
 */
export async function enqueueDraft(
  db: Db,
  workerId: string,
  draftUuid: string,
): Promise<EnqueueResult> {
  let result: EnqueueResult | null = null;

  await db.withExclusiveTransactionAsync(async (txn) => {
    // 1. Read the draft INSIDE the transaction so nothing can change under us.
    const row = await txn.getFirstAsync<{
      uuid: string;
      recorded_at: string;
      data: string;
      created_at: string;
      updated_at: string;
    }>(
      `SELECT uuid, recorded_at, data, created_at, updated_at
       FROM drafts WHERE worker_id = ? AND uuid = ?`,
      [workerId, draftUuid],
    );

    if (!row) {
      // Already queued (double tap, or reopened the app)?
      const existing = await txn.getFirstAsync(
        "SELECT 1 FROM queued_visits WHERE worker_id = ? AND uuid = ?",
        [workerId, draftUuid],
      );
      if (existing) {
        result = { uuid: draftUuid, alreadyQueued: true };
        return;
      }
      throw new EnqueueError("Draft not found");
    }

    const data = JSON.parse(row.data) as Draft["data"];
    const photos = await txn.getAllAsync<{
      client_photo_id: string;
      local_path: string;
      content_type: string | null;
      size_bytes: number | null;
    }>(
      `SELECT client_photo_id, local_path, content_type, size_bytes
       FROM draft_photos WHERE worker_id = ? AND draft_uuid = ? ORDER BY rowid`,
      [workerId, draftUuid],
    );

    // 2. Validate.
    if (data.site_id == null) throw new EnqueueError("No farm selected");
    if (data.project_id == null)
      throw new EnqueueError("No programme selected");

    const itemRows = await txn.getAllAsync<{ data: string }>(
      "SELECT data FROM supply_items WHERE worker_id = ?",
      [workerId],
    );
    const items = new Map<number, SupplyItem>(
      itemRows.map((r) => {
        const i = JSON.parse(r.data) as SupplyItem;
        return [i.id, i];
      }),
    );

    const deliveries = (data.deliveries ?? []).map((d) =>
      validateDelivery(d, items),
    );

    for (const p of photos) {
      if (!p.content_type || p.size_bytes == null || p.size_bytes <= 0) {
        throw new EnqueueError(
          `Photo ${p.client_photo_id} is missing its type or size`,
        );
      }
    }

    // 3. Freeze the request body. Never edited after this point.
    const request: VisitRequest = {
      uuid: row.uuid,
      site: data.site_id,
      recorded_at: row.recorded_at,
      deliveries,
      metadata: data.metadata ?? {},
      expected_photo_ids: photos.map((p) => p.client_photo_id),
    };

    // 4. Snapshots for display only (never sent).
    const siteRow = await txn.getFirstAsync<{ data: string }>(
      "SELECT data FROM sites WHERE worker_id = ? AND id = ?",
      [workerId, data.site_id],
    );
    const formRow = await txn.getFirstAsync<{ data: string }>(
      "SELECT data FROM form_definitions WHERE worker_id = ? AND project_id = ?",
      [workerId, data.project_id],
    );
    const projectRow = await txn.getFirstAsync<{ data: string }>(
      "SELECT data FROM projects WHERE worker_id = ? AND id = ?",
      [workerId, data.project_id],
    );
    const display = {
      site: siteRow ? JSON.parse(siteRow.data) : null,
      project: projectRow ? JSON.parse(projectRow.data) : null,
      items: deliveries.map((d) => {
        const i = items.get(d.item)!;
        return {
          id: i.id,
          name: i.name,
          unit: i.unit,
          quantity_kind: i.quantity_kind,
        };
      }),
    };

    // 5. Insert the visit, its photos, and remove the draft: all or nothing.
    const now = new Date().toISOString();
    await txn.runAsync(
      `INSERT INTO queued_visits
       (worker_id, uuid, request_json, project_id, site_id, form_definition,
        display_snapshot, status, attempts, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'queued', 0, ?, ?)`,
      [
        workerId,
        row.uuid,
        JSON.stringify(request),
        data.project_id,
        data.site_id,
        formRow ? formRow.data : "null",
        JSON.stringify(display),
        now,
        now,
      ],
    );
    for (const p of photos) {
      await txn.runAsync(
        `INSERT INTO queued_photos
         (worker_id, visit_uuid, client_photo_id, local_path, content_type, size_bytes, status)
         VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
        [
          workerId,
          row.uuid,
          p.client_photo_id,
          p.local_path,
          p.content_type,
          p.size_bytes,
        ],
      );
    }
    await txn.runAsync("DELETE FROM drafts WHERE worker_id = ? AND uuid = ?", [
      workerId,
      row.uuid,
    ]);

    result = { uuid: row.uuid, alreadyQueued: false };
  });

  if (!result) throw new EnqueueError("Enqueue did not complete");
  return result;
}
