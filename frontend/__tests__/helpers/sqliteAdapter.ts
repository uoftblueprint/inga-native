import type { Db } from "@/services/db";
import Database from "better-sqlite3";

type Params = unknown[];

/** A stand-in for expo-sqlite backed by a real SQLite file, for tests only. */
export function openTestDb(file: string): Db & { close(): void } {
  const raw = new Database(file);
  raw.pragma("journal_mode = WAL");
  raw.pragma("foreign_keys = ON");

  let lock: Promise<unknown> = Promise.resolve();

  const methods = {
    async execAsync(sql: string) {
      raw.exec(sql);
    },
    async runAsync(sql: string, params: Params = []) {
      const marks = (sql.match(/\?/g) ?? []).length;
      if (marks !== params.length) {
        throw new Error(
          `Placeholders: ${marks}, values: ${params.length}\n${sql}`,
        );
      }
      const r = raw.prepare(sql).run(...params);
      return { changes: r.changes, lastInsertRowId: Number(r.lastInsertRowid) };
    },
    async getFirstAsync(sql: string, params: Params = []) {
      return raw.prepare(sql).get(...params) ?? null;
    },
    async getAllAsync(sql: string, params: Params = []) {
      return raw.prepare(sql).all(...params);
    },
  };

  const db = {
    ...methods,
    // Transactions run one at a time, like expo-sqlite's exclusive transactions.
    // Commit if the callback finishes, roll back if it throws.
    async withExclusiveTransactionAsync(
      cb: (txn: typeof methods) => Promise<void>,
    ) {
      const run = lock.then(async () => {
        raw.exec("BEGIN EXCLUSIVE");
        try {
          await cb(methods);
          raw.exec("COMMIT");
        } catch (error) {
          raw.exec("ROLLBACK");
          throw error;
        }
      });
      lock = run.catch(() => undefined);
      return run;
    },
    close() {
      raw.close();
    },
  };

  return db as unknown as Db & { close(): void };
}
