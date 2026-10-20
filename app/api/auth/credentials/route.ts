import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const { mode, email, password } = await req.json();
  const supabase = await createServerClient();

  if (mode === "signup") {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    if (!data.session) {
      return NextResponse.json({
        notice:
          "Account created, but email confirmation is ON in Supabase. Turn off 'Confirm email' (Authentication > Providers > Email), then sign in.",
      });
    }
  } else {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  let redirect = "/dashboard";
  if (aal?.currentLevel !== "aal2") {
    redirect = aal?.nextLevel === "aal2" ? "/auth/verify" : "/auth/setup";
  }
  return NextResponse.json({ redirect });
}