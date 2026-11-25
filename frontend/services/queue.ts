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

export type QueuedPhoto = {
  client_photo_id: string;
  local_path: string;
  content_type: string;
  size_bytes: number;
  status: "pending" | "uploaded" | "registered" | "failed";
  upload_key: string | null;
  last_error: string | null;
  attempts: number;
  //   uploaded_at: string | null;
  //   registered_at: string | null;
};

export type QueuedVisit = {
  uuid: string;
  request: VisitRequest; // parsed from the frozen request_json
  project_id: number;
  site_id: number;
  form_definition: unknown;
  display_snapshot: unknown;
  status: QueuedVisitStatus;
  last_error: string | null;
  attempts: number;
  visit_created_at: string | null;
  //   created_at: string;
  //   updated_at: string;
  photos: QueuedPhoto[];
};

type VisitRow = {
  uuid: string;
  request_json: string;
  project_id: number;
  site_id: number;
  form_definition: string;
  display_snapshot: string;
  status: QueuedVisitStatus;
  last_error: string | null;
  attempts: number;
  visit_created_at: string | null;
  //   created_at: string; updated_at: string;
};

const PHOTO_COLUMNS = `client_photo_id, local_path, content_type, size_bytes, status,
  upload_key, last_error, attempts`;

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
      //   created_at: string;
      //   updated_at: string;
    }>(
      `SELECT uuid, recorded_at, data
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

    const isBlank = (d: {
      item: number | null;
      quantity: string | number | null;
    }) =>
      d.item == null &&
      (d.quantity == null || String(d.quantity).trim() === "");

    const deliveries = (data.deliveries ?? [])
      .filter((d) => !isBlank(d))
      .map((d) => validateDelivery(d, items));

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
    // const now = new Date().toISOString();
    await txn.runAsync(
      `INSERT INTO queued_visits
       (worker_id, uuid, request_json, project_id, site_id, form_definition,
        display_snapshot, status, attempts)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'queued', 0)`,
      [
        workerId,
        row.uuid,
        JSON.stringify(request),
        data.project_id,
        data.site_id,
        formRow ? formRow.data : "null",
        JSON.stringify(display),
        // now,
        // now,
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

function toVisit(row: VisitRow, photos: QueuedPhoto[]): QueuedVisit {
  return {
    uuid: row.uuid,
    request: JSON.parse(row.request_json) as VisitRequest,
    project_id: row.project_id,
    site_id: row.site_id,
    form_definition: JSON.parse(row.form_definition),
    display_snapshot: JSON.parse(row.display_snapshot),
    status: row.status,
    last_error: row.last_error,
    attempts: row.attempts,
    visit_created_at: row.visit_created_at,
    // created_at: row.created_at,
    // updated_at: row.updated_at,
    photos,
  };
}

export async function loadQueuedVisit(
  db: Db,
  workerId: string,
  uuid: string,
): Promise<QueuedVisit | null> {
  const row = await db.getFirstAsync<VisitRow>(
    "SELECT * FROM queued_visits WHERE worker_id = ? AND uuid = ?",
    [workerId, uuid],
  );
  if (!row) return null;
  const photos = await db.getAllAsync<QueuedPhoto>(
    `SELECT ${PHOTO_COLUMNS} FROM queued_photos
     WHERE worker_id = ? AND visit_uuid = ? ORDER BY rowid`,
    [workerId, uuid],
  );
  return toVisit(row, photos);
}

/** Oldest first, so the sender works through them in the order they were recorded. */
export async function listQueuedVisits(
  db: Db,
  workerId: string,
  status?: QueuedVisitStatus | QueuedVisitStatus[],
): Promise<QueuedVisit[]> {
  const statuses =
    status === undefined ? null : Array.isArray(status) ? status : [status];
  const rows = statuses
    ? await db.getAllAsync<{ uuid: string }>(
        `SELECT uuid FROM queued_visits
         WHERE worker_id = ? AND status IN (${statuses.map(() => "?").join(",")})
         ORDER BY rowid`,
        [workerId, ...statuses],
      )
    : await db.getAllAsync<{ uuid: string }>(
        "SELECT uuid FROM queued_visits WHERE worker_id = ? ORDER BY rowid",
        [workerId],
      );
  const out: QueuedVisit[] = [];
  for (const r of rows) {
    const v = await loadQueuedVisit(db, workerId, r.uuid);
    if (v) out.push(v);
  }
  return out;
}

/** Sets the visit status, optionally recording an error. Each call counts as one attempt when status is 'sending'. */
export async function updateVisitStatus(
  db: Db,
  workerId: string,
  uuid: string,
  status: Exclude<QueuedVisitStatus, "sent">,
  lastError: string | null = null,
): Promise<void> {
  const result = await db.runAsync(
    `UPDATE queued_visits
     SET status = ?, last_error = ?,
         attempts = attempts + CASE WHEN ? = 'sending' THEN 1 ELSE 0 END
        
     WHERE worker_id = ? AND uuid = ?`,
    [lastError, new Date().toISOString(), workerId, uuid],
  );
  if (result.changes === 0) throw new Error("Visit not found or already sent");
}

/** Step finished: the server confirmed POST /api/submissions/. Does NOT make the visit 'sent'. */
export async function markVisitCreated(
  db: Db,
  workerId: string,
  uuid: string,
): Promise<void> {
  await db.withExclusiveTransactionAsync(async (txn) => {
    const now = new Date().toISOString();
    await txn.runAsync(
      `UPDATE queued_visits
       SET visit_created_at = COALESCE(visit_created_at, ?)
       WHERE worker_id = ? AND uuid = ?`,
      [now, workerId, uuid],
    );
    await settleVisit(txn, workerId, uuid);
  });
}

// to show the recently used/visited farms (implemented to show 3 for now, exact number to be confirmed)
export async function recentSiteIds(
  db: Db,
  workerId: string,
  projectId: number,
  limit = 3, // TODO: confirm the limit
): Promise<number[]> {
  const rows = await db.getAllAsync<{ site_id: number }>(
    `SELECT site_id FROM queued_visits
     WHERE worker_id = ? AND project_id = ?
     GROUP BY site_id ORDER BY MAX(rowid) DESC LIMIT ?`,
    [workerId, projectId, limit],
  );
  return rows.map((r) => r.site_id);
}

/** Step finished: the photo's bytes were uploaded and we hold its storage key. */
export async function markPhotoUploaded(
  db: Db,
  workerId: string,
  visitUuid: string,
  clientPhotoId: string,
  uploadKey: string,
): Promise<void> {
  await db.runAsync(
    `UPDATE queued_photos
     SET status = 'uploaded', upload_key = ?, last_error = NULL
     WHERE worker_id = ? AND visit_uuid = ? AND client_photo_id = ?
       AND status IN ('pending','failed')`,
    [uploadKey, workerId, visitUuid, clientPhotoId],
  );
}

/** Step finished: POST /api/photos/ acknowledged this client_photo_id. May complete the visit. */
export async function markPhotoRegistered(
  db: Db,
  workerId: string,
  visitUuid: string,
  clientPhotoId: string,
): Promise<void> {
  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync(
      `UPDATE queued_photos
       SET status = 'registered', last_error = NULL
       WHERE worker_id = ? AND visit_uuid = ? AND client_photo_id = ?`,
      [workerId, visitUuid, clientPhotoId],
    );
    await settleVisit(txn, workerId, visitUuid);
  });
}

export async function markPhotoFailed(
  db: Db,
  workerId: string,
  visitUuid: string,
  clientPhotoId: string,
  error: string,
): Promise<void> {
  await db.runAsync(
    `UPDATE queued_photos
     SET status = CASE WHEN status = 'registered' THEN status ELSE 'failed' END,
         last_error = ?, attempts = attempts + 1
     WHERE worker_id = ? AND visit_uuid = ? AND client_photo_id = ?`,
    [error, workerId, visitUuid, clientPhotoId],
  );
}

/** Marks the visit 'sent' only when creation is confirmed AND every photo is registered. */
async function settleVisit(
  txn: Pick<Db, "getFirstAsync" | "runAsync">,
  workerId: string,
  uuid: string,
): Promise<void> {
  const visit = await txn.getFirstAsync<{ visit_created_at: string | null }>(
    "SELECT visit_created_at FROM queued_visits WHERE worker_id = ? AND uuid = ?",
    [workerId, uuid],
  );
  if (!visit?.visit_created_at) return;
  const pending = await txn.getFirstAsync(
    `SELECT 1 FROM queued_photos
     WHERE worker_id = ? AND visit_uuid = ? AND status != 'registered' LIMIT 1`,
    [workerId, uuid],
  );
  if (pending) return;
  await txn.runAsync(
    `UPDATE queued_visits SET status = 'sent', last_error = NULL
     WHERE worker_id = ? AND uuid = ?`,
    [workerId, uuid],
  );
}
