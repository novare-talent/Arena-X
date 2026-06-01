import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, searchParams } = request.nextUrl;

  // ── Capture referral code (OAuth-safe): set HttpOnly cookie that
  //    /auth/callback consumes once the user is created.
  //    Triggered by /invite/<CODE> or any URL with ?ref=<CODE>.
  const inviteMatch = pathname.match(/^\/invite\/([A-Za-z0-9_-]+)/);
  const refCode = (inviteMatch?.[1] ?? searchParams.get("ref") ?? "").trim();
  if (refCode) {
    supabaseResponse.cookies.set("arenax_ref", refCode.toUpperCase(), {
      httpOnly: true,
      sameSite: "lax",
      secure:   process.env.NODE_ENV === "production",
      path:     "/",
      maxAge:   60 * 30,  // 30 min — covers OAuth round-trip + form completion
    });
  }

  const publicPaths = ["/login", "/signup", "/auth/", "/invite/"];
  const isPublicPath = publicPaths.some((p) => pathname.startsWith(p));

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && (pathname === "/login" || pathname === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // NOTE: `api` is excluded — every /api route runs its own auth.getUser()
    // (real verification + token refresh via the route's cookie handler), so
    // running getUser() here too was a duplicate auth round-trip on every hot
    // path (submit, matchmaking, prompt-battle). Unauthenticated API calls
    // still get a 401 from the route itself. Pages keep the auth gate + the
    // referral-cookie capture below.
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};