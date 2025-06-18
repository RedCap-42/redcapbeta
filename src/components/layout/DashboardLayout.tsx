'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 px-6 py-4">
          <div className="text-center">
            <p className="text-sm text-gray-500">
              Créé avec <span className="text-red-500">❤️</span> par{' '}
              <span className="font-medium text-gray-700">CasquetteRouge</span>
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}