'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useAuth } from '@/context/AuthContext';
import { useGarminCredentials } from '@/hooks/useGarminCredentials';

export default function ConnexionPage() {
  const { user } = useAuth();
  const { credentials, loading: credentialsLoading } = useGarminCredentials();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClientComponentClient();

  const handleConnectGarmin = async () => {
    if (!user) {
      setError('Vous devez être connecté pour utiliser cette fonctionnalité');
      return;
    }

    if (!credentials) {
      setError('Veuillez configurer vos identifiants Garmin Connect dans l\'onglet Accueil');
      return;
    }

    setLoading(true);
    setError(null);
    setMessage('Connexion à Garmin Connect en cours...');

    try {
      // Appel à l'API pour se connecter à Garmin et télécharger les activités
      const response = await fetch('/api/garmin/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la synchronisation avec Garmin Connect');
      }

      setMessage(`Synchronisation réussie ! ${data.newActivities} nouvelles activités téléchargées.`);
    } catch (error: any) {
      console.error('Erreur lors de la connexion à Garmin:', error);
      setError(error.message || 'Une erreur est survenue lors de la connexion à Garmin Connect');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Connexion Garmin</h1>
      <p className="text-gray-600 mb-6">
        Connectez-vous à votre compte Garmin Connect pour télécharger vos dernières activités.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {message && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          {message}
        </div>
      )}

      <div className="flex flex-col space-y-4">
        <div className="p-4 bg-blue-50 rounded-md border border-blue-100">
          <p className="text-blue-800">
            {credentialsLoading
              ? 'Chargement de vos identifiants...'
              : credentials
              ? `Compte configuré : ${credentials.email}`
              : 'Aucun compte Garmin Connect configuré. Veuillez configurer vos identifiants dans l\'onglet Accueil.'}
          </p>
        </div>

        <button
          onClick={handleConnectGarmin}
          disabled={loading || !credentials}
          className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {loading ? 'Connexion en cours...' : 'Connecter / Actualiser'}
        </button>
      </div>
    </div>
  );
}

