import { ApiError } from "@/services/http";

/**
 * Turns a loading error into a message that says what went wrong and what to
 * do. Shared by the programme and farm screens.
 *
 * @param what what was being loaded, e.g. "farm list" or "programme list"
 */
export function loadErrorMessage(error: unknown, what: string): string {
  if (error instanceof ApiError) {
    // The server answered, but with an error: not the worker's connection
    return `The server couldn't send the ${what} (error ${error.status}). Try again later. If it keeps happening, tell your coordinator.`;
  }
  // The request never reached the server
  return "No internet connection. Connect to the internet, then try again.";
}
