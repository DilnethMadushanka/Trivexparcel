"use client";
import { clientAuth } from "./firebase";
import { DEMO, demoApi } from "./demo";

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/** Call the app's API with the signed-in user's Firebase ID token. */
export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  if (DEMO) {
    try { return await demoApi<T>(path, init); }
    catch (e) { throw new ApiError((e as { status?: number }).status || 400, (e as Error).message); }
  }
  const user = clientAuth().currentUser;
  if (!user) throw new ApiError(401, "Sign in to continue.");
  const token = await user.getIdToken();
  let res: Response;
  try {
    res = await fetch(path, {
      method: init.method || (init.body ? "POST" : "GET"),
      headers: { authorization: `Bearer ${token}`, ...(init.body ? { "content-type": "application/json" } : {}) },
      body: init.body ? JSON.stringify(init.body) : undefined
    });
  } catch {
    throw new ApiError(0, "Couldn't reach the server. Check your connection and try again.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, (data as { error?: string }).error || "Something went wrong. Try again.");
  return data as T;
}
