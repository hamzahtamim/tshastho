import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  const fallback = 'fallback_secret_for_development_only';

  if (!secret || secret === fallback) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: JWT_SECRET is missing or insecure in proxy.');
    }
    return fallback;
  }
  return secret;
};

const SECRET_KEY = new TextEncoder().encode(getJwtSecret());

export async function proxy(request: NextRequest) {
  // P2-14 FIX: CSRF Protection via Origin Check
  const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (mutatingMethods.includes(request.method)) {
    const pathname = request.nextUrl.pathname;
    
    // Exclude webhooks and payment gateway callbacks (server-to-server)
    const isWebhook = pathname.includes('/api/webhooks/') || 
                      pathname.includes('/api/payments/sslcommerz/');

    if (!isWebhook) {
      const origin = request.headers.get('origin');
      const host = request.headers.get('host') || request.headers.get('x-forwarded-host');
      
      if (origin && host) {
        try {
          const originHost = new URL(origin).host;
          if (originHost !== host) {
            if (process.env.NODE_ENV === 'development') {
              console.warn('[CSRF_DEV_BYPASS] Origin mismatch, but bypassing in development.');
            } else {
              console.warn('[CSRF_BLOCKED] Origin mismatch. Origin:', originHost, 'Host:', host);
              return new NextResponse('CSRF Protection: Origin mismatch', { status: 403 });
            }
          }
        } catch (error) {
          return new NextResponse('CSRF Protection: Invalid Origin', { status: 403 });
        }
      }
    }
  }

  const token = request.cookies.get('tshastho_session')?.value;

  // API routes that don't require authentication
  const publicApiRoutes = ['/api/auth/login', '/api/auth/logout', '/api/auth/me'];
  const isPublicApi = publicApiRoutes.some(route => request.nextUrl.pathname.startsWith(route));

  // Protected page routes
  const protectedRoutes = ['/dashboard', '/profile', '/admin', '/doctor', '/pharmacy', '/international'];
  const isProtectedPage = protectedRoutes.some(route => request.nextUrl.pathname.startsWith(route));

  if (isPublicApi) {
    return NextResponse.next();
  }

  if (isProtectedPage) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    try {
      await jwtVerify(token, SECRET_KEY);
      return NextResponse.next();
    } catch (error) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
