import * as SQLite from "expo-sqlite";

export type Db = SQLite.SQLiteDatabase;

const DB_NAME = "inga.db";

/**
 * Migrations run in order. Index 0 brings the database to version 1, index 1 to
 * version 2, and so on. Never edit a migration that has shipped; add a new one.
 */
const MIGRATIONS: string[] = [
  // ---- Version 1 ----
  `
  -- Downloaded catalogue (replaced wholesale on a successful download)
  CREATE TABLE projects (
    worker_id TEXT NOT NULL,
    id        INTEGER NOT NULL,
    name      TEXT NOT NULL,
    data      TEXT NOT NULL,
    PRIMARY KEY (worker_id, id)
  );

  CREATE TABLE form_definitions (
    worker_id    TEXT NOT NULL,
    project_id   INTEGER NOT NULL,
    data         TEXT NOT NULL,
    PRIMARY KEY (worker_id, project_id)
  );

  CREATE TABLE regions (
    worker_id TEXT NOT NULL,
    id        INTEGER NOT NULL,
    name      TEXT NOT NULL,
    data      TEXT NOT NULL,
    PRIMARY KEY (worker_id, id)
  );

  CREATE TABLE villages (
  worker_id TEXT NOT NULL,
  id        INTEGER NOT NULL,
  region_id INTEGER NOT NULL,
  name      TEXT NOT NULL,
  data      TEXT NOT NULL,
  PRIMARY KEY (worker_id, id)
);
CREATE INDEX idx_villages_region ON villages (worker_id, region_id);

CREATE TABLE sites (
  worker_id  TEXT NOT NULL,
  id         INTEGER NOT NULL,
  project_id INTEGER NOT NULL,
  region_id  INTEGER NOT NULL,   
  village_id INTEGER,            
  name       TEXT NOT NULL,
  data       TEXT NOT NULL,
  PRIMARY KEY (worker_id, id)
);
CREATE INDEX idx_sites_project ON sites (worker_id, project_id);

  CREATE TABLE supply_items (
    worker_id TEXT NOT NULL,
    id        INTEGER NOT NULL,
    name      TEXT NOT NULL,
    data      TEXT NOT NULL,
    PRIMARY KEY (worker_id, id)
  );

  -- Unfinished visits
  CREATE TABLE drafts (
    worker_id    TEXT NOT NULL,
    uuid         TEXT NOT NULL,
    recorded_at  TEXT NOT NULL,   -- set once when the draft starts, never changed
    project_id   INTEGER,
    site_id      INTEGER,
    data         TEXT NOT NULL,   -- deliveries, metadata, anything in progress
    PRIMARY KEY (worker_id, uuid)
  );

  CREATE TABLE draft_photos (
    worker_id       TEXT NOT NULL,
    draft_uuid      TEXT NOT NULL,
    client_photo_id TEXT NOT NULL,
    local_path      TEXT NOT NULL,
    content_type    TEXT,
    size_bytes      INTEGER,
    PRIMARY KEY (worker_id, draft_uuid, client_photo_id),
    FOREIGN KEY (worker_id, draft_uuid)
      REFERENCES drafts (worker_id, uuid) ON DELETE CASCADE
  );
  CREATE INDEX idx_draft_photos_path ON draft_photos (local_path);

  -- Completed visits waiting to be sent
  CREATE TABLE queued_visits (
    worker_id          TEXT NOT NULL,
    uuid               TEXT NOT NULL,
    request_json       TEXT NOT NULL,  -- frozen body for POST /api/submissions/
    project_id         INTEGER NOT NULL,
    site_id            INTEGER NOT NULL,
    form_definition    TEXT NOT NULL,  -- snapshot (never sent)
    display_snapshot   TEXT NOT NULL,  -- names and units (never sent)
    status             TEXT NOT NULL DEFAULT 'queued'
                       CHECK (status IN ('queued','sending','failed','sent')),
    last_error         TEXT,
    attempts           INTEGER NOT NULL DEFAULT 0,
    visit_created_at   TEXT,           -- set when the server confirms creation
    PRIMARY KEY (worker_id, uuid)
  );
  CREATE INDEX idx_queued_status ON queued_visits (worker_id, status);

  CREATE TABLE queued_photos (
    worker_id       TEXT NOT NULL,
    visit_uuid      TEXT NOT NULL,
    client_photo_id TEXT NOT NULL,
    local_path      TEXT NOT NULL,
    content_type    TEXT NOT NULL,
    size_bytes      INTEGER NOT NULL,
    status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','uploaded','registered','failed')),
    upload_key      TEXT,
    last_error      TEXT,
    attempts        INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (worker_id, visit_uuid, client_photo_id),
    FOREIGN KEY (worker_id, visit_uuid)
      REFERENCES queued_visits (worker_id, uuid) ON DELETE CASCADE
  );
  CREATE INDEX idx_queued_photos_path ON queued_photos (local_path);
  `,
];

/** Brings the database up to the latest version, one migration per transaction. */
export async function migrate(
  db: Db,
  migrations: string[] = MIGRATIONS,
): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version",
  );
  const current = row?.user_version ?? 0;

  for (let i = current; i < migrations.length; i++) {
    await db.withExclusiveTransactionAsync(async (txn) => {
      await txn.execAsync(migrations[i]);
      await txn.execAsync(`PRAGMA user_version = ${i + 1}`);
    });
  }
}

async function openAndMigrate(): Promise<Db> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.execAsync("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  await migrate(db);
  return db;
}

let dbPromise: Promise<Db> | null = null;

/** One shared connection for the whole app. Safe to call from anywhere, any number of times. */
export function getDb(): Promise<Db> {
  if (!dbPromise) {
    dbPromise = openAndMigrate().catch((error) => {
      dbPromise = null; // allow a retry after a failed open
      throw error;
    });
  }
  return dbPromise;
}
