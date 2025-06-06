'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import ActivityCalendar from '@/components/ActivityCalendar';

export default function AnalysePage() {
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    // La vérification de l'authentification est déjà gérée par le layout parent
    setIsLoading(false);
  }, [user]);

  if (isLoading) {
    return (
        <div className="flex justify-center items-center min-h-[calc(100vh-64px)]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
    );
  }

  return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Analyse d&apos;activités</h1>

        <div className="mb-4">
          <h2 className="text-xl font-semibold mb-4">Sélectionnez une date avec activité</h2>
          <ActivityCalendar />
        </div>
      </div>
  );
}