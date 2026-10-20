import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

// Checagem otimista: sem cookie de sessão, vai para /login.
export function proxy(req: NextRequest) {
  const logged = req.cookies.has(SESSION_COOKIE);
  const { pathname, searchParams } = req.nextUrl;

  if (pathname.startsWith("/login") && searchParams.get("expired") === "1") {
    const res = NextResponse.next();
    res.cookies.delete(SESSION_COOKIE);
    return res;
  }

  if (!logged && !pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (logged && pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/inicio", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|img|favicon.ico).*)"],
};
