import {apiFetch} from "@/services/api";
import {readJson} from "@/services/http";
import type {Site} from "@/types/form";

export async function getSite(id: number) {
  const response: Response = await apiFetch(`/api/site/${id}/`, {
    method: "GET",
  });

  return readJson<Site>(response);
}
