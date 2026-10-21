import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

// Reads the user's access token from "Authorization: Bearer <token>" or from { accessToken } in the JSON body
// (some proxies strip auth headers, so authFetch sends both).
export function getAccessToken(req: Request, body?: { accessToken?: unknown }): string | null {
  const header = req.headers.get("authorization");
  if (header?.toLowerCase().startsWith("bearer ")) return header.slice(7).trim();
  return typeof body?.accessToken === "string" ? body.accessToken : null;
}

// A Supabase client that runs queries AS the user, so your RLS policies apply on the server too.
export function createServerClient(accessToken?: string | null): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
  });
}

export type AuthResult =
  | { ok: true; user: User; supabase: SupabaseClient; aal: string | null }
  | { ok: false; status: 401 | 403; error: string };

// Validates the token with Supabase and enforces 2FA: an account that has a verified
// authenticator must present an aal2 token (i.e. it entered its 6-digit code this session).
export async function requireUser(accessToken: string | null): Promise<AuthResult> {
  if (!accessToken) return { ok: false, status: 401, error: "Unauthorized" };
  const supabase = createServerClient(accessToken);
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) return { ok: false, status: 401, error: "Unauthorized" };

  let aal: string | null = null;
  try {
    aal = JSON.parse(Buffer.from(accessToken.split(".")[1], "base64url").toString()).aal ?? null;
  } catch {
    aal = null;
  }
  const has2fa = data.user.factors?.some((f) => f.status === "verified") ?? false;
  if (has2fa && aal !== "aal2") return { ok: false, status: 403, error: "Enter your 2FA code first" };

  return { ok: true, user: data.user, supabase, aal };
}
