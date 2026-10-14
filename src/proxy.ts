import { NextResponse, type NextRequest } from "next/server";

// Checagem otimista: sem cookie de sessão, vai para /login.
export function proxy(req: NextRequest) {
  const logged = req.cookies.has("elabore_token");
  const { pathname } = req.nextUrl;
  if (!logged && !pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (logged && pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/propriedades", req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"] };
