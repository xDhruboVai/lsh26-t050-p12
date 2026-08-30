import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC = ['/login', '/signup', '/api/extract', '/icon.svg', '/opengraph-image', '/manifest.json'];

/**
 * Defence in depth. The app layout already redirects when there is no session;
 * this stops an unauthenticated request before it reaches a page at all.
 *
 * Presence of the cookie is all that is checked here, because middleware runs
 * on the edge and cannot reach the database. The layout and every API route
 * still verify the session against the sessions table.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next();
  }

  if (!request.cookies.get('ledger_session')) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
