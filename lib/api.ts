"use client";

import { createClient } from "@/lib/supabase/client";

// POST to one of our own API routes as the signed-in user.
// The token goes in the body because the preview proxy strips auth headers.
export async function apiFetch(path: string, body: Record<string, unknown> = {}) {
  const { data } = await createClient().auth.getSession();
  const token = data.session?.access_token ?? null;
  return fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ ...body, accessToken: token }),
  });
}
