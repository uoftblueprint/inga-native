import { apiFetch } from "@/services/api";
import { readJson } from "@/services/http";
import type { SubmissionBody } from "@/types/form";

export async function postSubmission(body: SubmissionBody) {
  const response = await apiFetch("/api/submissions/", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return readJson<unknown>(response);
}