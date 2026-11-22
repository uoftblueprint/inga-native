import type { Db } from "@/services/db";
import type { DraftPhoto } from "@/types/drafts";

type QueueVisitParams = {
  workerId: string;
  projectId: number;
  siteId: number;
  uuid: string;
  recordedAt: string;
  deliveries: { item: number; quantity: number }[];
  metadata: Record<string, unknown>;
  photos: DraftPhoto[];
  formDefinition: unknown;
  displaySnapshot: unknown;
};

export async function queueVisit(db: Db, params: QueueVisitParams) {
  await db.withExclusiveTransactionAsync(async (txn: any) => {
    const draft = await txn.getFirstAsync(
      "SELECT 1 FROM drafts WHERE worker_id = ? AND uuid = ?",
      [params.workerId, params.uuid],
    );
    if (!draft) throw new Error("The unfinished visit no longer exists.");

    const now = new Date().toISOString();
    const request = {
      uuid: params.uuid,
      recorded_at: params.recordedAt,
      site: params.siteId,
      deliveries: params.deliveries,
      metadata: params.metadata,
      expected_photo_ids: params.photos.map((photo) => photo.client_photo_id),
    };

    await txn.runAsync(
      `INSERT OR REPLACE INTO queued_visits
       (worker_id, uuid, request_json, project_id, site_id, form_definition,
        display_snapshot, status, attempts, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'queued', 0, ?, ?)`,
      [
        params.workerId,
        params.uuid,
        JSON.stringify(request),
        params.projectId,
        params.siteId,
        JSON.stringify(params.formDefinition),
        JSON.stringify(params.displaySnapshot),
        now,
        now,
      ],
    );

    for (const photo of params.photos) {
      await txn.runAsync(
        `INSERT OR REPLACE INTO queued_photos
         (worker_id, visit_uuid, client_photo_id, local_path, content_type,
          size_bytes, status, attempts)
         VALUES (?, ?, ?, ?, ?, ?, 'pending', 0)`,
        [
          params.workerId,
          params.uuid,
          photo.client_photo_id,
          photo.local_path,
          photo.content_type ?? "image/jpeg",
          photo.size_bytes ?? 0,
        ],
      );
    }

    await txn.runAsync(
      "DELETE FROM drafts WHERE worker_id = ? AND uuid = ?",
      [params.workerId, params.uuid],
    );
  });
}
