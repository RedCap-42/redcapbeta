'use client';

import { useAuth } from '@/context/AuthContext';

export default function Header() {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      // Utiliser la méthode du contexte d'authentification pour la déconnexion
      await signOut();

      // Forcer le rafraîchissement complet de la page pour réinitialiser l'état
      window.location.href = '/';
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 h-16 flex items-center justify-between px-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-800">Tableau de bord</h2>
      </div>
      
      {user && (
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">
            <span>{user.email}</span>
          </div>
          <button
            onClick={handleSignOut}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-md transition-colors"
          >
            Déconnexion
          </button>
        </div>
      )}
    </header>
  );
}