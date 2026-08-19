import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Route publik (tidak butuh PIN)
  const publicPaths = ["/login", "/api/login", "/api/inngest", "/setup", "/api/totp/setup", "/api/public", "/qr", "/api/public/equipment"];
  if (publicPaths.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  const session = req.cookies.get("brivice_session")?.value;
  const secret = process.env.SESSION_SECRET || "brivice-dev-secret";

  if (session !== secret) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};