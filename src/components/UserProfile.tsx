'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import { User } from '@supabase/supabase-js';

export default function UserProfile() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Récupérer l'utilisateur actuel
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
      } catch (error) {
        console.error('Erreur lors de la récupération de l\'utilisateur:', error);
      } finally {
        setLoading(false);
      }
    };

    getUser();

    // Écouter les changements d'authentification
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  if (loading) {
    return <div className="text-center p-4">Chargement...</div>;
  }

  if (!user) {
    return null; // Ne rien afficher si l'utilisateur n'est pas connecté
  }

  return (
    <div className="p-4 border rounded-lg shadow-sm max-w-md mx-auto">
      <h2 className="text-xl font-semibold mb-4">Profil utilisateur</h2>
      
      <div className="space-y-2">
        <p>
          <span className="font-medium">Email:</span> {user.email}
        </p>
        <p>
          <span className="font-medium">ID:</span> {user.id}
        </p>
        <p>
          <span className="font-medium">Dernière connexion:</span>{' '}
          {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'N/A'}
        </p>
      </div>
      
      <button
        onClick={handleSignOut}
        className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
      >
        Se déconnecter
      </button>
    </div>
  );
}