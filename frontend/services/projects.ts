import { apiFetch } from "@/services/api";
import { readJson } from "@/services/http";
import type { Project, Site } from "@/types/form";

export async function fetchProjects(): Promise<Project[]> {
  return readJson<Project[]>(await apiFetch("/api/projects/"));
}

export async function fetchSites(projectId: number): Promise<Site[]> {
  return readJson<Site[]>(await apiFetch(`/api/projects/${projectId}/sites/`));
}