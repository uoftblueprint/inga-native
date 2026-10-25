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

async function refreshAccessToken(): Promise<string | null> {
  try {
    const refresh = await SecureStore.getItemAsync("refresh");
    if (!refresh) return null;

    const response = await fetch(`${apiBaseUrl()}/api/accounts/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });
    if (!response.ok) return null;

    const data = await response.json();
    await SecureStore.setItemAsync("access", data.access);
    if (data.refresh) {
      await SecureStore.setItemAsync("refresh", data.refresh);
    }
    return data.access;
  } catch {
    return null;
  }
}

let refreshPromise: Promise<string | null> | null = null;

function refreshOnce(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
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
