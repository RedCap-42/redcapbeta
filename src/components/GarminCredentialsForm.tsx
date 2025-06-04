'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useAuth } from '@/context/AuthContext';

export default function GarminCredentialsForm() {
  const [garminEmail, setGarminEmail] = useState('');
  const [garminPassword, setGarminPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [hasCredentials, setHasCredentials] = useState(false);
  
  const { user } = useAuth();
  const supabase = createClientComponentClient();

  // Récupérer les identifiants existants
  useEffect(() => {
    const fetchGarminCredentials = async () => {
      if (!user) return;
      
      try {
        // Utiliser maybeSingle() au lieu de single() pour éviter l'erreur quand aucune ligne n'est trouvée
        const { data, error } = await supabase
          .from('garmin_credentials')
          .select('email')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (error) {
          console.error('Erreur lors de la récupération des identifiants Garmin:', error.message);
          return;
        }
        
        if (data) {
          setGarminEmail(data.email);
          setHasCredentials(true);
        } else {
          // Aucun identifiant trouvé, réinitialiser l'état
          setHasCredentials(false);
          setGarminEmail('');
          setGarminPassword('');
        }
      } catch (error) {
        console.error('Erreur inattendue:', error);
      }
    };
    
    fetchGarminCredentials();
  }, [user, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('Vous devez être connecté pour enregistrer vos identifiants Garmin');
      return;
    }
    
    setLoading(true);
    setError(null);
    setMessage(null);
    
    try {
      // Vérifier si l'utilisateur a déjà des identifiants
      const { data: existingData } = await supabase
        .from('garmin_credentials')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle(); // Utiliser maybeSingle() au lieu de single()
      
      // Insérer ou mettre à jour les identifiants
      if (existingData) {
        // Mise à jour
        const { error: updateError } = await supabase
          .from('garmin_credentials')
          .update({
            email: garminEmail,
            password_encrypted: garminPassword, // Dans une application réelle, il faudrait chiffrer ce mot de passe
          })
          .eq('user_id', user.id);
        
        if (updateError) throw updateError;
        setMessage('Vos identifiants Garmin ont été mis à jour avec succès');
      } else {
        // Insertion
        const { error: insertError } = await supabase
          .from('garmin_credentials')
          .insert({
            user_id: user.id,
            email: garminEmail,
            password_encrypted: garminPassword, // Dans une application réelle, il faudrait chiffrer ce mot de passe
          });
        
        if (insertError) throw insertError;
        setMessage('Vos identifiants Garmin ont été enregistrés avec succès');
      }
      
      setHasCredentials(true);
      setIsEditing(false);
    } catch (error: unknown) {
      const typedError = error as { message: string };
      console.error('Erreur lors de l\'enregistrement des identifiants Garmin:', error);
      setError(typedError.message || 'Une erreur est survenue lors de l\'enregistrement de vos identifiants');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null; // Ne rien afficher si l'utilisateur n'est pas connecté
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow-md w-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Identifiants Garmin Connect</h2>
        {hasCredentials && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="p-2 text-gray-600 hover:text-gray-800 focus:outline-none"
            title="Modifier les identifiants"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>
      
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
      
      {hasCredentials && !isEditing ? (
        <div className="mb-4">
          <p className="text-gray-700">Vos identifiants Garmin Connect sont enregistrés.</p>
          <p className="text-sm text-gray-500 mt-1">Email: {garminEmail}</p>
          <p className="text-sm text-gray-500">Mot de passe: ••••••••</p>
          <button
            onClick={() => setIsEditing(true)}
            className="mt-4 w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Modifier mes identifiants
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="garminEmail" className="block text-sm font-medium text-gray-700">
              Email Garmin Connect
            </label>
            <input
              id="garminEmail"
              type="email"
              value={garminEmail}
              onChange={(e) => setGarminEmail(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="votre.email@exemple.com"
            />
          </div>
          
          <div>
            <label htmlFor="garminPassword" className="block text-sm font-medium text-gray-700">
              Mot de passe Garmin Connect
            </label>
            <input
              id="garminPassword"
              type="password"
              value={garminPassword}
              onChange={(e) => setGarminPassword(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="••••••••"
            />
          </div>
          
          <div className="flex space-x-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Enregistrement...' : (hasCredentials ? 'Mettre à jour' : 'Enregistrer')}
            </button>
            
            {isEditing && (
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  // Réinitialiser le mot de passe si on annule l'édition
                  setGarminPassword('');
                }}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Annuler
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}

