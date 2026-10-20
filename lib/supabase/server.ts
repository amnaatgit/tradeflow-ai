import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

// The builder preview proxy strips cookies and Authorization headers, so the
// server cannot read the session from either. The browser sends the user's
// access token in the JSON body (and as a Bearer header for normal hosting);
// we accept either and validate it with Supabase.
export function getAccessToken(req: Request, body?: { accessToken?: unknown }): string | null {
  const header = req.headers.get("authorization");
  if (header?.toLowerCase().startsWith("bearer ")) return header.slice(7).trim();
  return typeof body?.accessToken === "string" ? body.accessToken : null;
}

export function createServerClient(accessToken?: string | null): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
  });
}

// Returns the signed-in user (and a client that runs queries as them, so RLS
// applies), or null if the token is missing or invalid.
export async function requireUser(
  accessToken: string | null
): Promise<{ supabase: SupabaseClient; user: User; aal: string | null } | null> {
  if (!accessToken) return null;
  const supabase = createServerClient(accessToken);
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) return null;
  let aal: string | null = null;
  try {
    aal = JSON.parse(Buffer.from(accessToken.split(".")[1], "base64url").toString()).aal ?? null;
  } catch {
    aal = null;
  }
  return { supabase, user: data.user, aal };
}
