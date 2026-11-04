import type { FieldValue, LogSchema } from "@/types/form";

export function buildPayload(
  schema: LogSchema,
  values: Record<string, string | boolean>
) {
  const metadata: Record<string, FieldValue> = {};
  const invalid: Record<string, string> = {};

  for (const [key, type] of Object.entries(schema)) {
    const raw = values[key];

    if (type === "boolean") {
      metadata[key] = raw === true;
      continue;
    }

    const text = typeof raw === "string" ? raw.trim() : "";
    if (!text) continue; // omit blank fields

    if (type === "numerical") {
      const n = Number(text.replace(",", "."));
      if (!Number.isFinite(n)) invalid[key] = "Enter a number.";
      else metadata[key] = n;
    } else {
      metadata[key] = text;
    }
  }
  return { metadata, invalid };
}