import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const res = NextResponse.next();
  
  // Éviter le middleware sur les routes API et les assets statiques
  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return res;
  }

  const supabase = createMiddlewareClient({ req: request, res });

  try {
    console.log('Middleware exécuté sur:', request.nextUrl.pathname);
    
    // Récupération de la session avec timeout pour éviter les boucles infinies
    const sessionPromise = supabase.auth.getSession();
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Session timeout')), 5000)
    );
    
    const { data: { session }, error } = await Promise.race([
      sessionPromise,
      timeoutPromise
    ]).catch((err) => {
      console.warn('Session retrieval failed:', err.message);
      return { data: { session: null }, error: err };
    });
    
    // Gestion spécifique des erreurs de token
    if (error) {
      console.warn('Erreur middleware:', error.message);
      
      // Si c'est une erreur de refresh token ou timeout, nettoyer et rediriger
      if (error.message.includes('refresh_token_not_found') || 
          error.message.includes('Invalid Refresh Token') ||
          error.message.includes('Session timeout') ||
          error.code === 'refresh_token_not_found') {
        console.log('Token invalide ou timeout, nettoyage des cookies');
        
        // Créer une réponse avec nettoyage complet des cookies
        const response = request.nextUrl.pathname.startsWith('/dashboard') 
          ? NextResponse.redirect(new URL('/', request.url))
          : NextResponse.next();
          
        // Nettoyer tous les cookies d'authentification possibles
        const cookiesToClear = [
          'supabase-auth-token',
          'sb-localhost-auth-token',
          'sb-auth-token',
          `sb-${new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || '').hostname.replace(/\./g, '-')}-auth-token`,
        ];
        
        cookiesToClear.forEach(cookieName => {
          response.cookies.set(cookieName, '', {
            expires: new Date(0),
            path: '/',
            domain: undefined,
            secure: false,
            httpOnly: false,
            sameSite: 'lax'
          });
        });
        
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

    return res;  } catch (error) {
    console.error('Erreur inattendue dans le middleware:', error);
    
    // En cas d'erreur de parsing ou autre, nettoyer et traiter comme non connecté
    const response = request.nextUrl.pathname.startsWith('/dashboard')
      ? NextResponse.redirect(new URL('/', request.url))
      : NextResponse.next();
      
    // Nettoyer tous les cookies d'authentification en cas d'erreur
    const cookiesToClear = [
      'supabase-auth-token',
      'sb-localhost-auth-token',
      'sb-auth-token',
      `sb-${new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || '').hostname.replace(/\./g, '-')}-auth-token`,
    ];
    
    cookiesToClear.forEach(cookieName => {
      response.cookies.set(cookieName, '', {
        expires: new Date(0),
        path: '/',
        domain: undefined,
        secure: false,
        httpOnly: false,
        sameSite: 'lax'
      });
    });
    
    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};