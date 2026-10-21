"use client";

import { createClient } from "./supabase/client";

// POST JSON to your own API route as the signed-in user (token in header and body).
export async function authFetch(path: string, body: Record<string, unknown> = {}) {
  const { data } = await createClient().auth.getSession();
  const token = data.session?.access_token ?? null;
  return fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ ...body, accessToken: token }),
  });
}
