'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useAuth } from '@/context/AuthContext';
import type { PrivateAliment } from '@/types/aliment';

export function useAliments() {
  // Fonction pour récupérer l'état depuis le localStorage
  const getStoredAliments = () => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem('privateAliments');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  const cachedAliments = getStoredAliments();
  const [privateAliments, setPrivateAliments] = useState<PrivateAliment[]>(cachedAliments);
  const [loading, setLoading] = useState(cachedAliments.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(cachedAliments.length > 0);
  const { user } = useAuth();
  const supabase = createClientComponentClient();

  // Sauvegarder les aliments dans localStorage
  const saveAliments = (aliments: PrivateAliment[]) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('privateAliments', JSON.stringify(aliments));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des aliments:', error);
    }  };

  useEffect(() => {
    const fetchAliments = async () => {
      // Si on a déjà fetch ou qu'on a des données en cache, ne pas refetch
      if (hasFetched || !user) {
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const { data: privateData, error: privateError } = await supabase
          .from('private_aliment')
          .select('*')
          .eq('user_id', user.id)
          .order('nom', { ascending: true });

        if (privateError) {
          console.error('Erreur lors de la récupération des aliments privés:', privateError);
          setError(`Erreur lors du chargement des aliments: ${privateError.message}`);
        } else {
          const newAliments = privateData || [];
          setPrivateAliments(newAliments);
          saveAliments(newAliments);
          setHasFetched(true);
        }
      } catch (err) {
        console.error('Erreur inattendue:', err);
        setError('Erreur inattendue lors du chargement');
      } finally {
        setLoading(false);
      }
    };

    fetchAliments();
  }, [user, supabase, hasFetched]);  const refetch = async () => {
    setHasFetched(false); // Forcer le rechargement
    const fetchAliments = async () => {
      try {
        setLoading(true);
        setError(null);

        // Récupérer les aliments privés (seulement si utilisateur connecté)
        if (user) {
          const { data: privateData, error: privateError } = await supabase
            .from('private_aliment')
            .select('*')
            .eq('user_id', user.id)
            .order('nom', { ascending: true });

          if (privateError) {
            console.error('Erreur lors de la récupération des aliments privés:', privateError);
          } else {
            const newAliments = privateData || [];
            setPrivateAliments(newAliments);
            saveAliments(newAliments);
            setHasFetched(true);
          }
        }
      } catch (err) {
        console.error('Erreur inattendue:', err);
        setError('Erreur inattendue lors du chargement');
      } finally {
        setLoading(false);
      }
    };

    await fetchAliments();
  };
  const deleteAliment = async (alimentId: number) => {
    if (!user) {
      throw new Error('Utilisateur non connecté');
    }

    try {
      setLoading(true);
      setError(null);

      // Supprimer l'aliment de la base de données
      const { error: deleteError } = await supabase
        .from('private_aliment')
        .delete()
        .eq('id', alimentId)
        .eq('user_id', user.id); // Sécurité supplémentaire

      if (deleteError) {
        console.error('Erreur lors de la suppression de l\'aliment:', deleteError);
        throw new Error(`Erreur lors de la suppression: ${deleteError.message}`);
      }

      // Mettre à jour l'état local en supprimant l'aliment
      const updatedAliments = privateAliments.filter(aliment => aliment.id !== alimentId);
      setPrivateAliments(updatedAliments);
      saveAliments(updatedAliments);

      return true;
    } catch (err) {
      console.error('Erreur lors de la suppression:', err);
      setError(err instanceof Error ? err.message : 'Erreur inattendue lors de la suppression');
      throw err;
    } finally {
      setLoading(false);
    }
  };
  return {
    privateAliments,
    loading,
    error,
    refetch,
    deleteAliment,
  };
}
