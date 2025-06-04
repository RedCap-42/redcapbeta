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