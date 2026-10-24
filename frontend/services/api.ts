import type { HealthResponse } from "@/types/health";
import * as SecureStore from "expo-secure-store";

function apiBaseUrl(): string {
  const value = process.env.EXPO_PUBLIC_API_URL;
  if (!value) {
    throw new Error("EXPO_PUBLIC_API_URL is not set");
  }
  return value.replace(/\/$/, "");
}

async function getAccessToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync("access");
  } catch {
    return null;
  }
}

export async function apiFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const access = await getAccessToken();

  const headers = new Headers(options.headers);
  if (access) {
    headers.set("Authorization", `Bearer ${access}`);
  }
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(`${apiBaseUrl()}${path}`, { ...options, headers });
}

export async function getHealth(): Promise<HealthResponse> {
  const response = await fetch(`${apiBaseUrl()}/api/health/`);
  if (!response.ok) {
    throw new Error(`Health check failed (${response.status})`);
  }
  return response.json() as Promise<HealthResponse>;
}
