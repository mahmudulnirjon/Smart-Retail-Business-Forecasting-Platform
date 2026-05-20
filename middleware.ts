import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback_secret_key'
);

const roleAccess: Record<string, string[]> = {
  '/': ['ADMIN', 'MANAGER', 'SALES'],
  '/product_page': ['ADMIN', 'MANAGER', 'SALES'],
  '/product_add': ['ADMIN', 'MANAGER', 'SALES'],
  '/sale_page': ['ADMIN', 'MANAGER', 'SALES'],
  '/sale_entry': ['ADMIN', 'MANAGER', 'SALES'],
  '/report_page': ['ADMIN', 'MANAGER'],
  '/inventory_alerts': ['ADMIN', 'MANAGER'],
  '/analytics_page': ['ADMIN', 'MANAGER'],
};

async function getRoleFromToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload.role as string;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname === '/login' ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const allowedRoles = roleAccess[pathname];

  if (!allowedRoles) {
    return NextResponse.next();
  }

  const token = req.cookies.get('auth_token')?.value;

  if (!token) {
    const loginUrl = new URL('/login', req.url);
    return NextResponse.redirect(loginUrl);
  }

  const role = await getRoleFromToken(token);

  if (!role || !allowedRoles.includes(role)) {
    const dashboardUrl = new URL('/', req.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};