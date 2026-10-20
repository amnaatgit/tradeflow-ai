import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return new NextResponse(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Add them to Secrets and restart.",
      { status: 500 }
    );
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: { name: string; value: string; options: CookieOptions }[]
      ) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const path = request.nextUrl.pathname;
  if (path.startsWith("/api/auth/")) return response;

  const go = (to: string, reason?: string) => {
    const target = request.nextUrl.clone();
    target.pathname = to;
    target.search = reason ? `?reason=${encodeURIComponent(reason)}` : "";
    const redirect = NextResponse.redirect(target);
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  };

  const isAuthPage = path.startsWith("/auth/");
  const isPublicAuthPage = path === "/auth/sign-in" || path === "/auth/sign-up";

  let user = null;
  let reason = "no-session";
  try {
    const { data, error } = await supabase.auth.getUser();
    user = data.user;
    if (error) {
      reason = error.message;
    }
  } catch (e) {
    user = null;
    reason = e instanceof Error ? e.message : "getUser failed";
  }

  if (!user) {
    if (isPublicAuthPage) return response;
    return go("/auth/sign-in");
  }

  let currentLevel: string | null | undefined;
  let nextLevel: string | null | undefined;
  try {
    const { data: aal } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    currentLevel = aal?.currentLevel;
    nextLevel = aal?.nextLevel;
  } catch {
    currentLevel = null;
    nextLevel = null;
  }

  if (currentLevel !== "aal2") {
    const needsVerify = nextLevel === "aal2";
    const wanted = needsVerify ? "/auth/verify" : "/auth/setup";
    if (path === wanted) return response;
    return go(wanted);
  }

  if (isAuthPage) return go("/dashboard");

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
