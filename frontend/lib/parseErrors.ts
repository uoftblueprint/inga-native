import { ApiError } from "@/services/http";
import type { LogSchema } from "@/types/form";

const toList = (v: unknown): string[] =>
  Array.isArray(v) ? v.map(String) : [String(v)];

export function parseErrors(err: unknown, schema: LogSchema) {
  const fieldErrors: Record<string, string> = {};
  const general: string[] = [];

  if (
    !(err instanceof ApiError) ||
    err.status !== 400 ||
    typeof err.body !== "object" ||
    !err.body
  ) {
    return {
      fieldErrors,
      general: "Could not submit. Please try again." as string | null,
    };
  }

  for (const value of Object.values(err.body as Record<string, unknown>)) {
    for (const msg of toList(value)) {
      const key = Object.keys(schema).find((k) => msg.includes(`'${k}'`));
      if (key) fieldErrors[key] = msg;
      else general.push(msg);
    }
  }
  return { fieldErrors, general: general.length ? general.join(" ") : null };
}

// Repeated uuid means the first attempt already got through.
export function isUuidConflict(err: unknown): boolean {
  if (!(err instanceof ApiError) || err.status !== 400) return false;
  const u = (err.body as Record<string, unknown> | null)?.uuid;
  return !!u && toList(u).some((m) => /exist/i.test(m));
}