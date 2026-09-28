import type { HealthResponse } from "@/types/health";

function apiBaseUrl(): string {
  const value = process.env.EXPO_PUBLIC_API_URL;
  if (!value) {
    throw new Error("EXPO_PUBLIC_API_URL is not set");
  }
  return value.replace(/\/$/, "");
}

export async function getHealth(): Promise<HealthResponse> {
  const response = await fetch(`${apiBaseUrl()}/api/health/`);
  if (!response.ok) {
    throw new Error(`Health check failed (${response.status})`);
  }
  return response.json() as Promise<HealthResponse>;
}
