import { useCallback, useEffect, useState } from "react";
import { fetchProjects, fetchSites } from "@/services/projects";
import type { Project, Site } from "@/types/form";

function useLoad<T>(load: () => Promise<T>) {
  const [result, setResult] = useState<{
    load: () => Promise<T>;
    tick: number;
    data?: T;
    isError: boolean;
  }>();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    load()
      .then((d) => {
        if (!cancelled) setResult({ load, tick, data: d, isError: false });
      })
      .catch(() => {
        if (!cancelled) setResult({ load, tick, isError: true });
      });
    return () => {
      cancelled = true;
    };
  }, [load, tick]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);
  const current = result?.load === load && result.tick === tick;
  return {
    data: current ? result.data : undefined,
    isPending: !current,
    isError: current ? result.isError : false,
    refetch,
  };
}

export function useProjects() {
  return useLoad<Project[]>(fetchProjects);
}

export function useSites(projectId: number) {
  const load = useCallback(() => fetchSites(projectId), [projectId]);
  return useLoad<Site[]>(load);
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
