import type { Db } from "@/services/db";

export type DraftData = {
  project_id?: number | null;
  site_id?: number | null;
  // rows the worker is editing; validated later, at enqueue
  deliveries?: { item: number | null; quantity: string | number | null }[];
  metadata?: Record<string, unknown>;
};

export type DraftPhoto = {
  client_photo_id: string;
  local_path: string;
  content_type: string | null;
  size_bytes: number | null;
};

export type Draft = {
  uuid: string;
  recorded_at: string;
  data: DraftData;
  photos: DraftPhoto[];
  //   created_at: string;
  //   updated_at: string;
};

/** RFC 4122 v4 UUID. Swap for expo-crypto's randomUUID() if the project already has it. */
export function newUuid(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    return (ch === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** Starts a new draft. uuid and recorded_at are fixed here and never rewritten. */
export async function createDraft(
  db: Db,
  workerId: string,
  initial: DraftData = {},
): Promise<Draft> {
  const uuid = newUuid();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO drafts (worker_id, uuid, recorded_at, project_id, site_id, data)
    VALUES (?, ?, ?, ?, ?, ?)`,
    [
      workerId,
      uuid,
      now,
      initial.project_id ?? null,
      initial.site_id ?? null,
      JSON.stringify(initial),
      // now,
      // now,
    ],
  );
  return {
    uuid,
    recorded_at: now,
    data: initial,
    photos: [],
    // created_at: now,
    // updated_at: now,
  };
}

type DraftRow = {
  uuid: string;
  recorded_at: string;
  data: string;
  //   created_at: string;
  //   updated_at: string;
};

export async function loadDraft(
  db: Db,
  workerId: string,
  uuid: string,
): Promise<Draft | null> {
  const row = await db.getFirstAsync<DraftRow>(
    `SELECT uuid, recorded_at, data
     FROM drafts WHERE worker_id = ? AND uuid = ?`,
    [workerId, uuid],
  );
  if (!row) return null;
  const photos = await db.getAllAsync<DraftPhoto>(
    `SELECT client_photo_id, local_path, content_type, size_bytes
     FROM draft_photos WHERE worker_id = ? AND draft_uuid = ?
     ORDER BY rowid`,
    [workerId, uuid],
  );
  return { ...row, data: JSON.parse(row.data) as DraftData, photos };
}

export async function listDrafts(db: Db, workerId: string): Promise<Draft[]> {
  const rows = await db.getAllAsync<{ uuid: string }>(
    "SELECT uuid FROM drafts WHERE worker_id = ? ORDER BY rowid DESC",
    [workerId],
  );
  const out: Draft[] = [];
  for (const r of rows) {
    const d = await loadDraft(db, workerId, r.uuid);
    if (d) out.push(d);
  }
  return out;
}

/**
 * Saves edits. Only data, project_id, site_id change;
 * uuid and recorded_at are never in the UPDATE. Returns false if the draft
 * no longer exists (for example it was already queued).
 */
export async function saveDraft(
  db: Db,
  workerId: string,
  uuid: string,
  data: DraftData,
): Promise<boolean> {
  const result = await db.runAsync(
    `UPDATE drafts SET data = ?, project_id = ?, site_id = ?
     WHERE worker_id = ? AND uuid = ?`,
    [
      JSON.stringify(data),
      data.project_id ?? null,
      data.site_id ?? null,
      workerId,
      uuid,
    ],
  );
  return result.changes > 0;
}

export async function addDraftPhoto(
  db: Db,
  workerId: string,
  draftUuid: string,
  photo: DraftPhoto,
): Promise<void> {
  await db.withExclusiveTransactionAsync(async (txn) => {
    const exists = await txn.getFirstAsync(
      "SELECT 1 FROM drafts WHERE worker_id = ? AND uuid = ?",
      [workerId, draftUuid],
    );
    if (!exists) throw new Error("Draft not found");
    await txn.runAsync(
      `INSERT OR REPLACE INTO draft_photos
       (worker_id, draft_uuid, client_photo_id, local_path, content_type, size_bytes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        workerId,
        draftUuid,
        photo.client_photo_id,
        photo.local_path,
        photo.content_type,
        photo.size_bytes,
      ],
    );
    // await txn.runAsync(
    //   "UPDATE drafts SET updated_at = ? WHERE worker_id = ? AND uuid = ?",
    //   [new Date().toISOString(), workerId, draftUuid],
    // );
  });
}

export async function removeDraftPhoto(
  db: Db,
  workerId: string,
  draftUuid: string,
  clientPhotoId: string,
): Promise<string[]> {
  let freePaths: string[] = [];

  await db.withExclusiveTransactionAsync(async (txn) => {
    const row = await txn.getFirstAsync<{ local_path: string }>(
      `SELECT local_path FROM draft_photos
       WHERE worker_id = ? AND draft_uuid = ? AND client_photo_id = ?`,
      [workerId, draftUuid, clientPhotoId],
    );
    await txn.runAsync(
      `DELETE FROM draft_photos
       WHERE worker_id = ? AND draft_uuid = ? AND client_photo_id = ?`,
      [workerId, draftUuid, clientPhotoId],
    );
    freePaths = row ? await unusedPaths(txn, [row.local_path]) : [];
  });

  return freePaths;
}

/**
 * Discards a draft and its photo rows. Returns the file paths that are now
 * safe to delete (no other draft or queued photo uses them). The caller deletes
 * the files, because the database layer never touches the filesystem.
 */
export async function discardDraft(
  db: Db,
  workerId: string,
  uuid: string,
): Promise<string[]> {
  let freePaths: string[] = [];

  await db.withExclusiveTransactionAsync(async (txn) => {
    const paths = await txn.getAllAsync<{ local_path: string }>(
      "SELECT local_path FROM draft_photos WHERE worker_id = ? AND draft_uuid = ?",
      [workerId, uuid],
    );
    await txn.runAsync("DELETE FROM drafts WHERE worker_id = ? AND uuid = ?", [
      workerId,
      uuid,
    ]); // photo rows go too, via ON DELETE CASCADE
    freePaths = await unusedPaths(
      txn,
      paths.map((p) => p.local_path),
    );
  });

  return freePaths;
}

/** Of these paths, which are referenced by no draft photo and no queued photo (any worker)? */
export async function unusedPaths(
  db: Pick<Db, "getFirstAsync">,
  paths: string[],
): Promise<string[]> {
  const free: string[] = [];
  for (const p of new Set(paths)) {
    const used = await db.getFirstAsync(
      `SELECT 1 FROM draft_photos WHERE local_path = ?
       UNION ALL SELECT 1 FROM queued_photos WHERE local_path = ? LIMIT 1`,
      [p, p],
    );
    if (!used) free.push(p);
  }
  return free;
}
