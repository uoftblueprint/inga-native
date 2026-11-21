import { apiFetch } from "@/services/api";
import { readJson } from "@/services/http";
import type { Project, Site } from "@/types/form";
import { MOCK_PROJECTS, mockSitesFor } from "@/mocks/farms";

/** true: screens use the sample data in mocks/farms.ts instead of the server.
 *  Set to false once Olivia's village change is live. */
// TODO: PLEASE REMMEBER TO CHANGEEE
const USE_MOCK_DATA = true;

// active programmes only from API
export async function fetchProjects(): Promise<Project[]> {
  const response = await apiFetch("/api/projects/"); // await- waiting for server’s reply
  return readJson<Project[]>(response);
}

export async function fetchSites(projectId: number): Promise<Site[]> {
  const response = await apiFetch(`/api/projects/${projectId}/sites/`);
//   const sites = await readJson<Site[]>(response);
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
  if (USE_MOCK_DATA) {
    return { projects: MOCK_PROJECTS, fromSaved: false };
  }
  const projects = await fetchProjects();
  return { projects, fromSaved: false };
}

export async function getSites(projectId: number): Promise<SiteList> {
  if (USE_MOCK_DATA) {
    return { sites: mockSitesFor(projectId), fromSaved: false };
  }
  const sites = await fetchSites(projectId);
  return { sites, fromSaved: false };
}
