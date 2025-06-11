import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase: Variables d\'environnement manquantes!');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'défini' : 'non défini');
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'défini' : 'non défini');
  throw new Error('Les variables d\'environnement Supabase sont manquantes');
}

console.log('Supabase: Initialisation du client avec URL:', supabaseUrl);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Ajouter un écouteur pour les changements d'état d'authentification pour le débogage
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Supabase: Changement d\'état d\'authentification -', event);
  console.log('Supabase: Session existe:', !!session);
});

// Fonction utilitaire pour nettoyer les cookies d'authentification corrompus
export const clearAuthCookies = () => {
  if (typeof document !== 'undefined') {
    // Nettoyer tous les cookies liés à Supabase
    const cookiesToClear = [
      'supabase-auth-token',
      'sb-localhost-auth-token',
      'sb-auth-token',
      // Ajouter d'autres patterns de cookies Supabase si nécessaire
    ];
    
    cookiesToClear.forEach(cookieName => {
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=localhost;`;
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.localhost;`;
    });
    
    console.log('Cookies d\'authentification nettoyés');
  }
};

// Fonction pour vérifier si on a des tokens corrompus
export const hasCorruptedTokens = async () => {
  try {
    const { error } = await supabase.auth.getSession();
    return error && (
      error.message.includes('refresh_token_not_found') ||
      error.message.includes('Invalid Refresh Token') ||
      error.code === 'refresh_token_not_found'
    );
  } catch {
    return true; // En cas d'erreur, considérer comme corrompu
  }
};