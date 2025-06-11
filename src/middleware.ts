import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req: request, res });

  try {
    console.log('Middleware exécuté sur:', request.nextUrl.pathname);
    
    // Récupération de la session avec gestion d'erreur améliorée
    const { data: { session }, error } = await supabase.auth.getSession();
    
    // Gestion spécifique des erreurs de token
    if (error) {
      console.warn('Erreur middleware:', error.message);
      
      // Si c'est une erreur de refresh token, nettoyer les cookies et traiter comme non connecté
      if (error.message.includes('refresh_token_not_found') || 
          error.message.includes('Invalid Refresh Token') ||
          error.code === 'refresh_token_not_found') {
        console.log('Token de rafraîchissement invalide, nettoyage des cookies');
        
        // Nettoyer les cookies d'authentification
        const response = NextResponse.next();
        response.cookies.delete('supabase-auth-token');
        response.cookies.delete('sb-localhost-auth-token');
        
        // Traiter comme utilisateur non connecté
        if (request.nextUrl.pathname.startsWith('/dashboard')) {
          console.log('Redirection vers / (token invalide)');
          return NextResponse.redirect(new URL('/', request.url));
        }
        
        return response;
      }
      
      // Pour les autres erreurs, laisser passer sans redirection
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
    
    // En cas d'erreur de parsing ou autre, nettoyer et traiter comme non connecté
    const response = NextResponse.next();
    
    // Si on est sur une route protégée, rediriger vers l'accueil
    if (request.nextUrl.pathname.startsWith('/dashboard')) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    
    return response;
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};