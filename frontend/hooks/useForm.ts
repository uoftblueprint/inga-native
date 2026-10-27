import { PROJECTS, SITES } from "@/mocks/data";

export function useProjects() {
  return { data: PROJECTS, isPending: false, isError: false};
}

export function useSites(projectId: number) {
  const data = SITES.filter((s) => s.projectId === projectId);
  return { data, isPending: false, isError: false};
}

export function useProject(projectId: number) {
  const data = PROJECTS.find((p) => p.id === projectId);
  return { data, isPending: false, isError: !data};
}