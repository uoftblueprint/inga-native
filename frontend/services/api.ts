import type { HealthResponse } from "@/types/health";
import { router } from "expo-router";
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
  const refresh = await SecureStore.getItemAsync("refresh");
  if (!refresh) return null; // user is signed out

  const response = await fetch(`${apiBaseUrl()}/api/accounts/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });

  if (response.status === 401) return null;
  if (!response.ok) {
    // i.e. not 200 to 299, and not 401 either, so not the user's fault
    throw new Error(`Refresh failed (${response.status})`); // user is not signed out
  }

  const data = await response.json();
  await SecureStore.setItemAsync("access", data.access);
  if (data.refresh) {
    // only true if backend sent a new refresh token
    await SecureStore.setItemAsync("refresh", data.refresh);
  }
  return data.access;
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

export async function send(
  path: string,
  options: RequestInit,
  access: string | null,
): Promise<Response> {
  // const access = await getAccessToken();

  const headers = new Headers(options.headers);
  if (access) {
    headers.set("Authorization", `Bearer ${access}`);
  }
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(`${apiBaseUrl()}${path}`, { ...options, headers });
}

export async function apiFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const access = await getAccessToken();
  const response = await send(path, options, access);

  if (response.status !== 401 || !access) {
    return response;
  }

  let newAccess: string | null;
  try {
    newAccess = await refreshOnce();
  } catch {
    // Couldn't reach the server: keep the tokens, let the caller see the 401
    return response;
  }

  if (!newAccess) {
    await endSession();
    return response;
  }

  return send(path, options, newAccess);
}

export async function getHealth(): Promise<HealthResponse> {
  const response = await fetch(`${apiBaseUrl()}/api/health/`);
  if (!response.ok) {
    throw new Error(`Health check failed (${response.status})`);
  }
  return response.json() as Promise<HealthResponse>;
}

export async function clearSession(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync("access");
    await SecureStore.deleteItemAsync("refresh");
  } catch (error) {
    console.warn("Could not clear session:", error);
  }
}

async function endSession(): Promise<void> {
  await clearSession();
  router.replace("/login"); // swap current screen for /login to ensure back button does not return to broken screen
}
