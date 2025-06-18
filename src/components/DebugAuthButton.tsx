'use client';

import { forceAuthCleanup } from '@/utils/supabase';
import { useRouter } from 'next/navigation';

export const DebugAuthButton = () => {
  const router = useRouter();
  
  const handleForceCleanup = async () => {
    try {
      console.log('Manuel: Début du nettoyage de l\'authentification');
      await forceAuthCleanup();
      console.log('Manuel: Nettoyage terminé, redirection vers l\'accueil');
      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('Manuel: Erreur lors du nettoyage:', error);
    }
  };

  // Seulement afficher en développement
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <button
      onClick={handleForceCleanup}
      className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded text-sm hover:bg-red-600 z-50"
      title="Nettoyer l'état d'authentification (dev only)"
    >
      🔧 Clear Auth
    </button>
  );
};
