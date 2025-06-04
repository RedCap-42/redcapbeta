import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req: request, res });

  // Récupération de la session
  const { data: { session } } = await supabase.auth.getSession();
  
  console.log('Middleware exécuté sur:', request.nextUrl.pathname);
  console.log('Session existe:', !!session);

  // Si l'utilisateur est sur la page d'accueil et est connecté, rediriger vers le dashboard
  if (request.nextUrl.pathname === '/') {
    if (session) {
      console.log('Redirection vers /dashboard');
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Si l'utilisateur tente d'accéder au dashboard sans être connecté, rediriger vers la page d'accueil
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!session) {
      console.log('Redirection vers /');
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};