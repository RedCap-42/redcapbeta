'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import Auth from '@/components/auth/Auth';
import { retryWithBackoff } from '@/utils/retryWithBackoff';

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const checkSession = async () => {
      try {
        console.log('Home: Vérification de la session');
        
        // Utiliser retryWithBackoff pour gérer les rate limits
        const { data: { session }, error } = await retryWithBackoff(
          () => supabase.auth.getSession(),
          2, // Maximum 2 retries
          1000 // Délai de base de 1 seconde
        );
        
        if (error) {
          console.error('Home: Erreur lors de la vérification de la session:', error.message);
          
          // Si c'est une erreur de rate limit, on affiche quand même le formulaire de connexion
          if (error.message.includes('rate limit') || error.message.includes('429')) {
            console.log('Home: Rate limit détecté, affichage du formulaire de connexion');
            setIsAuthenticated(false);
            setIsLoading(false);
            return;
          }
          
          // Pour les autres erreurs, on affiche aussi le formulaire
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }

        if (session) {
          console.log('Home: Session trouvée, redirection vers le dashboard');
          setIsAuthenticated(true);
          // Utiliser replace au lieu de push pour éviter les problèmes d'historique de navigation
          router.replace('/dashboard');
        } else {
          console.log('Home: Aucune session trouvée, affichage du formulaire de connexion');
          setIsAuthenticated(false);
        }
      } catch (error: unknown) {
        console.error('Home: Erreur inattendue:', error);
        
        // Si c'est un rate limit, afficher le formulaire de connexion quand même
        if ((error as Error).message?.includes('rate limit') || (error as { status?: number }).status === 429) {
          console.log('Home: Rate limit final, affichage du formulaire');
          setIsAuthenticated(false);
        } else {
          // Pour les autres erreurs, afficher le formulaire de connexion
          setIsAuthenticated(false);
        }
      } finally {
        setIsLoading(false);
      }
    };

    // Ajouter un délai plus long pour éviter les appels trop fréquents et réduire le rate limiting
    const timeoutId = setTimeout(checkSession, 500);
    
    return () => clearTimeout(timeoutId);
  }, [supabase, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Chargement...</h1>
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">RedCapBeta</h1>
          <p className="text-gray-600">Web logiciel pour analyser ses données (Garmin)</p>
        </div>
        
        {isAuthenticated ? (
          <div className="text-center p-4 bg-green-100 border border-green-400 text-green-700 rounded mb-4">
            Vous êtes connecté. Redirection vers le tableau de bord...
            <div className="mt-4">
              <button 
                onClick={() => router.replace('/dashboard')} 
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Accéder au tableau de bord
              </button>
            </div>
          </div>
        ) : (
          <Auth />
        )}
      </div>
    </div>
  );
}
