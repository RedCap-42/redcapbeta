'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import UserProfile from '@/components/profile/UserProfile';

export default function ProfilePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Rediriger vers la page d'accueil si l'utilisateur n'est pas connecté
    if (!isLoading && !user) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  // Afficher un message de chargement pendant la vérification de l'authentification
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-lg">Chargement...</p>
      </div>
    );
  }

  // Si l'utilisateur n'est pas connecté, ne rien afficher (la redirection se fera via useEffect)
  if (!user) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8 text-center">Votre profil</h1>
      <p className="text-center mb-8">
        Cette page n&apos;est accessible qu&apos;aux utilisateurs connectés.
      </p>
      <UserProfile />
    </div>
  );
}

