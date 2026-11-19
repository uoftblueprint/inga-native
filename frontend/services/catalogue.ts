import type { Db } from "@/services/db";
import type { Project, Region, Site } from "@/types/form";

// Shapes below follow the backend serializers you listed. Anything not confirmed
// yet (village, supply items) is kept loose, and the full JSON is stored anyway.
// export type Region = {
//   id: number;
//   name: string;
//   latitude: string | null;
//   longitude: string | null;
// };

// export type Project = {
//   id: number;
//   name: string;
//   description: string;
//   active: boolean;
//   log_schema: unknown; // the form definition
// };

export type Village = {
  id: number;
  region: number; // the region it belongs to (check the real field name)
  name: string;
};

export type SiteWithVillage = {
  id: number;
  project: number;
  region: Region | number; // required
  village?: Village | number | null; // optional
  name: string;
  address: string;
  description: string;
};

export type SupplyItem = {
  id: number;
  name: string;
  category: string;
  unit: string;
  quantity_kind: "count" | "measure";
};

/** Pulls the region id out of a site whether `region` is nested or just a number. */
function regionIdOf(region: SiteWithVillage["region"]): number | null {
  if (region === null || region === undefined) return null;
  return typeof region === "number" ? region : region.id;
}

function villageIdOf(v: SiteWithVillage["village"]): number | null {
  if (v === null || v === undefined) return null;
  return typeof v === "number" ? v : v.id;
}

// ---------------------------------------------------------------------------
// Projects (programmes) and their form definitions
// ---------------------------------------------------------------------------

/**
 * Replaces this worker's saved projects and form definitions in ONE transaction.
 * If anything throws, the transaction rolls back and the old lists stay.
 */
export async function saveProjects(
  db: Db,
  workerId: string,
  projects: Project[],
): Promise<void> {
  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync("DELETE FROM projects WHERE worker_id = ?", [workerId]);
    await txn.runAsync("DELETE FROM form_definitions WHERE worker_id = ?", [
      workerId,
    ]);
    for (const p of projects) {
      await txn.runAsync(
        "INSERT INTO projects (worker_id, id, name, data) VALUES (?, ?, ?, ?)",
        [workerId, p.id, p.name, JSON.stringify(p)],
      );
      await txn.runAsync(
        "INSERT INTO form_definitions (worker_id, project_id, data) VALUES (?, ?, ?)",
        [workerId, p.id, JSON.stringify(p.log_schema ?? null)],
      );
    }
  });
}

export async function loadProjects(
  db: Db,
  workerId: string,
): Promise<Project[]> {
  const rows = await db.getAllAsync<{ data: string }>(
    "SELECT data FROM projects WHERE worker_id = ? ORDER BY name",
    [workerId],
  );
  return rows.map((r) => JSON.parse(r.data) as Project);
}

export async function loadFormDefinition(
  db: Db,
  workerId: string,
  projectId: number,
): Promise<unknown | null> {
  const row = await db.getFirstAsync<{ data: string }>(
    "SELECT data FROM form_definitions WHERE worker_id = ? AND project_id = ?",
    [workerId, projectId],
  );
  return row ? JSON.parse(row.data) : null;
}

// ---------------------------------------------------------------------------
// Regions (locations)
// ---------------------------------------------------------------------------

// export async function saveRegions(
//   db: Db,
//   workerId: string,
//   regions: Region[],
// ): Promise<void> {
//   await db.withExclusiveTransactionAsync(async (txn) => {
//     await txn.runAsync("DELETE FROM regions WHERE worker_id = ?", [workerId]);
//     for (const r of regions) {
//       await txn.runAsync(
//         "INSERT INTO regions (worker_id, id, name, data) VALUES (?, ?, ?, ?)",
//         [workerId, r.id, r.name, JSON.stringify(r)],
//       );
//     }
//   });
// }

export async function loadRegions(db: Db, workerId: string): Promise<Region[]> {
  const rows = await db.getAllAsync<{ data: string }>(
    "SELECT data FROM regions WHERE worker_id = ? ORDER BY name",
    [workerId],
  );
  return rows.map((r) => JSON.parse(r.data) as Region);
}

// ---------------------------------------------------------------------------
// Sites (farms)
// ---------------------------------------------------------------------------

/**
 * Replaces the saved sites for ONE project. Other projects' sites are untouched,
 * because sites are downloaded per project (GET /api/projects/<id>/sites/).
 */
export async function saveSites(
  db: Db,
  workerId: string,
  projectId: number,
  sites: SiteWithVillage[],
): Promise<void> {
  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync(
      "DELETE FROM sites WHERE worker_id = ? AND project_id = ?",
      [workerId, projectId],
    );
    for (const s of sites) {
      await txn.runAsync(
        `INSERT INTO sites (worker_id, id, project_id, region_id, village_id, name, data)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          workerId,
          s.id,
          projectId,
          regionIdOf(s.region),
          villageIdOf(s.village),
          s.name,
          JSON.stringify(s),
        ],
      );
    }
  });
}

export async function loadSites(
  db: Db,
  workerId: string,
  projectId: number,
): Promise<Site[]> {
  const rows = await db.getAllAsync<{ data: string }>(
    "SELECT data FROM sites WHERE worker_id = ? AND project_id = ? ORDER BY name",
    [workerId, projectId],
  );
  return rows.map((r) => JSON.parse(r.data) as Site);
}

// ---------------------------------------------------------------------------
// Supply items
// ---------------------------------------------------------------------------

export async function saveSupplyItems(
  db: Db,
  workerId: string,
  items: SupplyItem[],
): Promise<void> {
  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync("DELETE FROM supply_items WHERE worker_id = ?", [
      workerId,
    ]);
    for (const i of items) {
      await txn.runAsync(
        "INSERT INTO supply_items (worker_id, id, name, data) VALUES (?, ?, ?, ?)",
        [workerId, i.id, i.name, JSON.stringify(i)],
      );
    }
  });
}

export async function loadSupplyItems(
  db: Db,
  workerId: string,
): Promise<SupplyItem[]> {
  const rows = await db.getAllAsync<{ data: string }>(
    "SELECT data FROM supply_items WHERE worker_id = ? ORDER BY name",
    [workerId],
  );
  return rows.map((r) => JSON.parse(r.data) as SupplyItem);
}

export async function saveLocations(
  db: Db,
  workerId: string,
  regions: Region[],
  villages: Village[],
): Promise<void> {
  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync("DELETE FROM regions WHERE worker_id = ?", [workerId]);
    await txn.runAsync("DELETE FROM villages WHERE worker_id = ?", [workerId]);
    for (const r of regions) {
      await txn.runAsync(
        "INSERT INTO regions (worker_id, id, name, data) VALUES (?, ?, ?, ?)",
        [workerId, r.id, r.name, JSON.stringify(r)],
      );
    }
    for (const v of villages) {
      await txn.runAsync(
        "INSERT INTO villages (worker_id, id, region_id, name, data) VALUES (?, ?, ?, ?, ?)",
        [workerId, v.id, v.region, v.name, JSON.stringify(v)],
      );
    }
  });
}

export async function loadVillages(
  db: Db,
  workerId: string,
  regionId?: number,
): Promise<Village[]> {
  const rows =
    regionId === undefined
      ? await db.getAllAsync<{ data: string }>(
          "SELECT data FROM villages WHERE worker_id = ? ORDER BY name",
          [workerId],
        )
      : await db.getAllAsync<{ data: string }>(
          "SELECT data FROM villages WHERE worker_id = ? AND region_id = ? ORDER BY name",
          [workerId, regionId],
        );
  return rows.map((r) => JSON.parse(r.data) as Village);
}
