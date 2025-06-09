import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req: request, res });

  try {
    // Récupération de la session avec gestion d'erreur
    const { data: { session }, error } = await supabase.auth.getSession();
    
    console.log('Middleware exécuté sur:', request.nextUrl.pathname);
    
    // Si il y a une erreur (comme rate limit), laisser passer sans redirection
    if (error) {
      console.warn('Erreur middleware:', error.message);
      return res;
    }
    
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
  } catch (error) {
    console.error('Erreur inattendue dans le middleware:', error);
    // En cas d'erreur, laisser passer la requête sans redirection
    return res;
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};