import { apiFetch } from "frontend/services/api";
import { readJson } from "frontend/services/http";
import type { Project, Site } from "frontend/types/form";


// active programmes only from API
export async function fetchProjects(): Promise<Project[]> {
  const response = await apiFetch("/api/projects/"); // await- waiting for server’s reply
  return readJson<Project[]>(response);
}

export async function fetchSites(projectId: number): Promise<Site[]> {
  const response = await apiFetch(`/api/projects/${projectId}/sites/`);
  const sites = await readJson<Site[]>(response);
//   for (const site of sites) {
//     site.village = site.village ?? null;
//   }
//   return sites;
   return readJson<Site[]>(response);

}


// Programmes, plus whether they came from the phone's saved copy
export type ProjectList = { projects: Project[]; fromSaved: boolean }; // DEPENDS ON ARYAN

// One programme's farms, plus whether they came from the phone's saved copy
export type SiteList = { sites: Site[]; fromSaved: boolean }; // DEPENDS ON ARYAN

export async function getProjects(): Promise<ProjectList> {
  const projects = await fetchProjects();
  return { projects, fromSaved: false }; // DEPENDS ON ARYAN
}

export async function getSites(projectId: number): Promise<SiteList> {
  const sites = await fetchSites(projectId);
  return { sites, fromSaved: false }; // DEPENDS ON ARYAN
}
