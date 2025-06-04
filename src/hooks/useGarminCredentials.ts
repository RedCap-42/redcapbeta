'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useAuth } from '@/context/AuthContext';

type GarminCredentials = {
  email: string;
  password: string;
};

export function useGarminCredentials() {
  const [credentials, setCredentials] = useState<GarminCredentials | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchCredentials = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('garmin_credentials')
          .select('email, password_encrypted')
          .eq('user_id', user.id)
          .maybeSingle(); // Utiliser maybeSingle() au lieu de single()

        if (error) {
          console.error('Erreur lors de la récupération des identifiants Garmin:', error.message);
          setError(error.message);
          return;
        }

        if (data) {
          setCredentials({
            email: data.email,
            password: data.password_encrypted,
          });
        } else {
          // Aucun identifiant trouvé
          setCredentials(null);
        }
      } catch (err: any) {
        console.error('Erreur inattendue:', err);
        setError(err.message || 'Une erreur est survenue');
      } finally {
        setLoading(false);
      }
    };

    fetchCredentials();
  }, [user, supabase]);

  return { credentials, loading, error };
}