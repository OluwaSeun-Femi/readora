import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, adminToken, safeEqual } from "@/lib/admin-token";

// Sends visitors without the librarian cookie to the sign-in page.
// Every admin server action checks again, because actions can be called directly.
export function proxy(request: NextRequest) {
  const passcode = process.env.ADMIN_PASSCODE;
  if (!passcode || request.nextUrl.pathname.startsWith("/admin/login")) {
    return NextResponse.next();
  }
  // Server actions check the passcode themselves and answer with a clear message,
  // so let their requests through instead of redirecting them.
  if (request.method === "POST" && request.headers.has("next-action")) {
    return NextResponse.next();
  }
  const value = request.cookies.get(ADMIN_COOKIE)?.value;
  if (value && safeEqual(value, adminToken(passcode))) return NextResponse.next();
  return NextResponse.redirect(new URL("/admin/login", request.url));
}

export const config = {
  matcher: ["/admin/:path*"],
};
