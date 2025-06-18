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
    // Ajout de configuration pour éviter les boucles de refresh
    flowType: 'pkce',
    debug: false
  },
  global: {
    // Configuration pour limiter les retries qui peuvent causer des boucles
    fetch: async (url, options = {}) => {
      // Ajouter un timeout et limiter les retries
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 secondes timeout

      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        console.error('Supabase fetch error:', error);
        throw error;
      }
    }
  }
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
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const hostname = supabaseUrl ? new URL(supabaseUrl).hostname.replace(/\./g, '-') : 'localhost';
    
    const cookiesToClear = [
      'supabase-auth-token',
      'sb-localhost-auth-token',
      'sb-auth-token',
      `sb-${hostname}-auth-token`,
      // Patterns spécifiques pour les différents environnements
      'sb-127-0-0-1-auth-token',
      'sb-local-auth-token',
    ];
    
    cookiesToClear.forEach(cookieName => {
      // Nettoyer sur plusieurs domaines et chemins possibles
      const domains = ['localhost', '.localhost', '127.0.0.1', '.127.0.0.1', undefined];
      const paths = ['/', undefined];
      
      domains.forEach(domain => {
        paths.forEach(path => {
          const cookieString = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC;${path ? ` path=${path};` : ''}${domain ? ` domain=${domain};` : ''}`;
          document.cookie = cookieString;
        });
      });
    });
    
    console.log('Cookies d\'authentification nettoyés');
  }
};

// Fonction pour forcer un nettoyage complet de l'état d'authentification
export const forceAuthCleanup = async () => {
  console.log('Début du nettoyage forcé de l\'authentification');
  
  try {
    // Déconnexion Supabase
    await supabase.auth.signOut();
  } catch (error) {
    console.warn('Erreur lors de la déconnexion Supabase:', error);
  }
  
  // Nettoyage des cookies
  clearAuthCookies();
  
  // Nettoyage du localStorage si disponible
  if (typeof localStorage !== 'undefined') {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('supabase') || key.includes('sb-'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.warn('Erreur lors du nettoyage localStorage:', error);
      }
    });
  }
  
  // Nettoyage du sessionStorage si disponible
  if (typeof sessionStorage !== 'undefined') {
    const keysToRemove = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && (key.includes('supabase') || key.includes('sb-'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => {
      try {
        sessionStorage.removeItem(key);
      } catch (error) {
        console.warn('Erreur lors du nettoyage sessionStorage:', error);
      }
    });
  }
  
  console.log('Nettoyage forcé de l\'authentification terminé');
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

// Fonction pour créer un client Supabase avec gestion d'erreur améliorée pour les composants
export const createSafeSupabaseClient = () => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      debug: false
    },
    global: {
      fetch: async (url, options = {}) => {
        // Timeout plus court et gestion d'erreur améliorée
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 secondes timeout

        try {
          const response = await fetch(url, {
            ...options,
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          
          // Si la réponse n'est pas OK et que c'est une erreur d'auth, ne pas retry
          if (!response.ok && response.status === 401) {
            console.warn('Authentication error detected, stopping retries');
            throw new Error(`Authentication failed: ${response.status}`);
          }
          
          return response;
        } catch (error) {
          clearTimeout(timeoutId);
          
          // Ne pas logger les erreurs d'abort pour éviter le spam
          if (error instanceof Error && error.name !== 'AbortError') {
            console.error('Supabase safe fetch error:', error);
          }
          
          throw error;
        }
      }
    }
  });
};