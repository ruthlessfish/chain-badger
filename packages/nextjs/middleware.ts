import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Only protect /debug routes
  if (request.nextUrl.pathname.startsWith("/debug")) {
    // Use server-only env var (no NEXT_PUBLIC_ prefix) for better security
    // This value is never exposed to the client
    const isDebugEnabled = process.env.ENABLE_DEBUG_ROUTES === "true";

    if (!isDebugEnabled) {
      // Return 404 for debug routes when not enabled
      return NextResponse.rewrite(new URL("/404", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/debug/:path*",
};
