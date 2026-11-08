import { useCallback, useEffect, useState } from "react";
import { fetchProjects, fetchSites } from "@/services/projects";
import type { Project, Site } from "@/types/form";

function useLoad<T>(load: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | undefined>(undefined);
  const [isPending, setPending] = useState(true);
  const [isError, setError] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setPending(true);
    setError(false);
    load()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setPending(false);
      });
    return () => {
      cancelled = true;
    };
  }, [...deps, tick]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);
  return { data, isPending, isError, refetch };
}

export function useProjects() {
  return useLoad<Project[]>(fetchProjects, []);
}

export function useSites(projectId: number) {
  return useLoad<Site[]>(() => fetchSites(projectId), [projectId]);
}

export function useProject(projectId: number) {
  const { data, isPending, isError, refetch } = useProjects();
  const project = data?.find((p) => p.id === projectId);
  return {
    data: project,
    isPending,
    isError: isError || (!isPending && !project),
    refetch,
  };
}