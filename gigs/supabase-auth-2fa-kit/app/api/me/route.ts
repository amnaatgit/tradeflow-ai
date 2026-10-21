import { NextResponse } from "next/server";
import { getAccessToken, requireUser } from "../../../lib/supabase/server";

// Example protected API route: 401 without a valid token, 403 if 2FA is on but not entered.
// Queries through auth.supabase run as the user, so RLS applies.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const auth = await requireUser(getAccessToken(req, body));
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  // Example query (uncomment after running supabase/rls-template.sql):
  // const { data } = await auth.supabase.from("notes").select("*");
  return NextResponse.json({ id: auth.user.id, email: auth.user.email, aal: auth.aal });
}
