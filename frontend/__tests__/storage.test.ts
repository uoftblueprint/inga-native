/** @jest-environment node */
jest.mock("expo-sqlite", () => ({})); // db.ts imports it; tests never use it

import fs from "fs";
import os from "os";
import path from "path";

import { loadSupplyItems, saveSupplyItems } from "@/services/catalogue";
import { migrate } from "@/services/db";
import {
    addDraftPhoto,
    createDraft,
    listDrafts,
    loadDraft,
    saveDraft,
} from "@/services/drafts";
import {
    EnqueueError,
    enqueueDraft,
    listQueuedVisits,
    loadQueuedVisit,
    markPhotoRegistered,
    markPhotoUploaded,
    markVisitCreated,
    updateVisitStatus,
} from "@/services/queue";
import { openTestDb } from "./helpers/sqliteAdapter";

const A = "worker-a";
const B = "worker-b";

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

let dir: string;
let file: string;
let opened: ReturnType<typeof openTestDb>[] = [];

async function open() {
  const db = openTestDb(file);
  opened.push(db);
  await migrate(db);
  return db;
}

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "inga-test-"));
  file = path.join(dir, "test.db");
  opened = [];
});

afterEach(() => {
  for (const db of opened) {
    try {
      db.close();
    } catch {
      /* already closed */
    }
  }
  fs.rmSync(dir, { recursive: true, force: true });
});

/** A draft ready to enqueue: one delivery row, optionally one photo. */
async function readyDraft(
  db: Awaited<ReturnType<typeof open>>,
  worker: string,
  withPhoto = false,
) {
  await saveSupplyItems(db, worker, [SEEDS, SAPLINGS]);
  const draft = await createDraft(db, worker, {
    project_id: 1,
    site_id: 10,
    deliveries: [{ item: 1, quantity: "2.5" }],
    metadata: { "Soil tested": true },
  });
  if (withPhoto) {
    await addDraftPhoto(db, worker, draft.uuid, {
      client_photo_id: "photo-1",
      local_path: "file:///photos/1.jpg",
      content_type: "image/jpeg",
      size_bytes: 1234,
    });
  }
  return draft;
}

describe("restarting offline", () => {
  test("lists, drafts and queued visits survive closing and reopening, with no network", async () => {
    const fetchMock = jest.fn();
    (globalThis as { fetch?: unknown }).fetch = fetchMock;

    const db = await open();
    await saveSupplyItems(db, A, [SEEDS]);
    const unfinished = await createDraft(db, A, { project_id: 1, site_id: 10 });
    const finished = await readyDraft(db, A, true);
    await enqueueDraft(db, A, finished.uuid);
    db.close(); // the app is killed

    const reopened = await open(); // the app starts again, offline
    expect(await loadSupplyItems(reopened, A)).toEqual([SAPLINGS, SEEDS]);

    const draft = await loadDraft(reopened, A, unfinished.uuid);
    expect(draft?.recorded_at).toBe(unfinished.recorded_at);

    const queued = await listQueuedVisits(reopened, A);
    expect(queued).toHaveLength(1);
    expect(queued[0].photos[0].local_path).toBe("file:///photos/1.jpg");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("failed saves", () => {
  test("a failed list save keeps the previous list", async () => {
    const db = await open();
    await saveSupplyItems(db, A, [SEEDS]);

    // Two rows with the same id break the primary key part-way through the save.
    await expect(
      saveSupplyItems(db, A, [SAPLINGS, SAPLINGS]),
    ).rejects.toThrow();

    expect(await loadSupplyItems(db, A)).toEqual([SEEDS]);
  });

  test("a failed enqueue leaves the draft untouched and queues nothing", async () => {
    const db = await open();
    const draft = await readyDraft(db, A, true);

    await saveDraft(db, A, draft.uuid, {
      project_id: 1,
      site_id: 10,
      deliveries: [{ item: 1, quantity: "0" }], // not positive
    });
    await expect(enqueueDraft(db, A, draft.uuid)).rejects.toBeInstanceOf(
      EnqueueError,
    );

    expect(await loadDraft(db, A, draft.uuid)).not.toBeNull();
    expect(await listQueuedVisits(db, A)).toHaveLength(0);

    // A count item must be a whole number.
    await saveDraft(db, A, draft.uuid, {
      project_id: 1,
      site_id: 10,
      deliveries: [{ item: 2, quantity: "1.5" }],
    });
    await expect(enqueueDraft(db, A, draft.uuid)).rejects.toBeInstanceOf(
      EnqueueError,
    );

    // Fixing the draft lets the same draft queue normally.
    await saveDraft(db, A, draft.uuid, {
      project_id: 1,
      site_id: 10,
      deliveries: [{ item: 2, quantity: 3 }],
    });
    const result = await enqueueDraft(db, A, draft.uuid);
    expect(result.alreadyQueued).toBe(false);
  });
});

describe("changing accounts", () => {
  test("one worker never sees another worker's data", async () => {
    const db = await open();
    const draftA = await readyDraft(db, A, true);
    await enqueueDraft(db, A, draftA.uuid);
    const leftoverA = await createDraft(db, A, { project_id: 1, site_id: 10 });

    expect(await loadSupplyItems(db, B)).toEqual([]);
    expect(await listDrafts(db, B)).toEqual([]);
    expect(await listQueuedVisits(db, B)).toEqual([]);
    expect(await loadDraft(db, B, leftoverA.uuid)).toBeNull();
    expect(await loadQueuedVisit(db, B, draftA.uuid)).toBeNull();
    await expect(enqueueDraft(db, B, leftoverA.uuid)).rejects.toThrow(
      "Draft not found",
    );

    // B saving their own lists doesn't disturb A's.
    await saveSupplyItems(db, B, [SAPLINGS]);
    expect(await loadSupplyItems(db, A)).toEqual([SAPLINGS, SEEDS]);
    expect(await loadSupplyItems(db, B)).toEqual([SAPLINGS]);
    expect(await listQueuedVisits(db, A)).toHaveLength(1);
  });
});

describe("submitting the same draft twice", () => {
  async function count(db: Awaited<ReturnType<typeof open>>, table: string) {
    const row = await db.getFirstAsync<{ n: number }>(
      `SELECT COUNT(*) AS n FROM ${table}`,
    );
    return row?.n;
  }

  test("a second tap returns the existing visit", async () => {
    const db = await open();
    const draft = await readyDraft(db, A, true);

    const first = await enqueueDraft(db, A, draft.uuid);
    const second = await enqueueDraft(db, A, draft.uuid);

    expect(first.alreadyQueued).toBe(false);
    expect(second.alreadyQueued).toBe(true);
    expect(await count(db, "queued_visits")).toBe(1);
    expect(await count(db, "queued_photos")).toBe(1);
    expect(await loadDraft(db, A, draft.uuid)).toBeNull();
  });

  test("two taps at the same moment queue it once", async () => {
    const db = await open();
    const draft = await readyDraft(db, A, true);

    const results = await Promise.all([
      enqueueDraft(db, A, draft.uuid),
      enqueueDraft(db, A, draft.uuid),
    ]);

    expect(results.filter((r) => !r.alreadyQueued)).toHaveLength(1);
    expect(await count(db, "queued_visits")).toBe(1);
  });

  test("reopening the app and submitting again doesn't queue it twice", async () => {
    const db = await open();
    const draft = await readyDraft(db, A);
    await enqueueDraft(db, A, draft.uuid);
    db.close();

    const reopened = await open();
    const again = await enqueueDraft(reopened, A, draft.uuid);

    expect(again.alreadyQueued).toBe(true);
    expect(await count(reopened, "queued_visits")).toBe(1);
  });
});

describe("what gets queued", () => {
  test("uuid and recorded_at are kept exactly, and the body is never edited", async () => {
    const db = await open();
    const draft = await readyDraft(db, A, true);
    await enqueueDraft(db, A, draft.uuid);

    const visit = await loadQueuedVisit(db, A, draft.uuid);
    expect(visit?.request.uuid).toBe(draft.uuid);
    expect(visit?.request.recorded_at).toBe(draft.recorded_at);
    expect(visit?.request.expected_photo_ids).toEqual(["photo-1"]);
    expect(visit?.request.deliveries).toEqual([{ item: 1, quantity: 2.5 }]);

    const before = JSON.stringify(visit?.request);
    await markVisitCreated(db, A, draft.uuid);
    expect(
      JSON.stringify((await loadQueuedVisit(db, A, draft.uuid))?.request),
    ).toBe(before);
  });

  test("a visit is only 'sent' once its creation is confirmed AND every photo is registered", async () => {
    const db = await open();
    const draft = await readyDraft(db, A, true);
    await enqueueDraft(db, A, draft.uuid);

    await markVisitCreated(db, A, draft.uuid);
    expect((await loadQueuedVisit(db, A, draft.uuid))?.status).toBe("queued");

    await markPhotoUploaded(db, A, draft.uuid, "photo-1", "server-key");
    await markPhotoRegistered(db, A, draft.uuid, "photo-1");
    expect((await loadQueuedVisit(db, A, draft.uuid))?.status).toBe("sent");
  });
});

describe("form edge cases", () => {
  test("fully blank delivery rows are ignored, half-filled rows are rejected", async () => {
    const db = await open();
    const draft = await readyDraft(db, A);

    await saveDraft(db, A, draft.uuid, {
      project_id: 1,
      site_id: 10,
      deliveries: [
        { item: 1, quantity: "2.5" },
        { item: null, quantity: "" }, // blank row from the form
      ],
    });
    await enqueueDraft(db, A, draft.uuid);
    const visit = await loadQueuedVisit(db, A, draft.uuid);
    expect(visit?.request.deliveries).toEqual([{ item: 1, quantity: 2.5 }]);
  });

  test("a half-filled row is still rejected", async () => {
    const db = await open();
    const draft = await readyDraft(db, A);

    await saveDraft(db, A, draft.uuid, {
      project_id: 1,
      site_id: 10,
      deliveries: [{ item: 1, quantity: "" }],
    });
    await expect(enqueueDraft(db, A, draft.uuid)).rejects.toBeInstanceOf(
      EnqueueError,
    );
  });
});

describe("pending and completed lists", () => {
  test("pending includes queued, sending and failed; completed is sent only", async () => {
    const db = await open();
    const a = await readyDraft(db, A);
    const b = await createDraft(db, A, { project_id: 1, site_id: 10 });
    const c = await createDraft(db, A, { project_id: 1, site_id: 10 });
    for (const d of [a, b, c]) await enqueueDraft(db, A, d.uuid);

    await updateVisitStatus(db, A, b.uuid, "failed", "no signal");
    await markVisitCreated(db, A, c.uuid); // no photos, so it becomes 'sent'

    const pending = await listQueuedVisits(db, A, [
      "queued",
      "sending",
      "failed",
    ]);
    const completed = await listQueuedVisits(db, A, "sent");

    expect(pending.map((v) => v.uuid).sort()).toEqual([a.uuid, b.uuid].sort());
    expect(completed.map((v) => v.uuid)).toEqual([c.uuid]);
  });
});

describe("draft updated_at", () => {
  test("saving bumps updated_at, keeps recorded_at, and orders the list", async () => {
    const db = await open();
    const first = await createDraft(db, A, { project_id: 1, site_id: 10 });
    const second = await createDraft(db, A, { project_id: 1, site_id: 10 });

    await new Promise((r) => setTimeout(r, 5)); // make sure the clock moves
    await saveDraft(db, A, first.uuid, {
      project_id: 1,
      site_id: 10,
      metadata: { Notes: "x" },
    });

    const edited = await loadDraft(db, A, first.uuid);
    expect(edited?.recorded_at).toBe(first.recorded_at);
    expect(edited!.updated_at > first.updated_at).toBe(true);

    const order = (await listDrafts(db, A)).map((d) => d.uuid);
    expect(order).toEqual([first.uuid, second.uuid]);
  });
});
