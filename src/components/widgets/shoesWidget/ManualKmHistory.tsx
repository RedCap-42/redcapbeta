'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface ManualKmEntry {
  id: string;
  kilometers: number;
  title: string;
  description: string | null;
  activity_date: string;
  created_at: string;
}

interface ManualKmHistoryProps {
  shoeId: string;
  shoeName: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function ManualKmHistory({ shoeId, shoeName, isOpen, onClose, onUpdate }: ManualKmHistoryProps) {
  const [entries, setEntries] = useState<ManualKmEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClientComponentClient();
  useEffect(() => {
    const fetchManualKmEntries = async () => {
      if (!isOpen || !shoeId) return;

      try {
        setIsLoading(true);
        setError('');
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setError('Vous devez être connecté');
          return;
        }

        const { data, error: fetchError } = await supabase
          .from('manual_km')
          .select('id, kilometers, title, description, activity_date, created_at')
          .eq('shoe_id', shoeId)
          .eq('user_id', user.id)
          .order('activity_date', { ascending: false });

        if (fetchError) {
          throw fetchError;
        }

        setEntries(data || []);
      } catch (err: unknown) {
        setError((err as Error).message || 'Erreur lors du chargement de l\'historique');
      } finally {
        setIsLoading(false);
      }
    };

    fetchManualKmEntries();
  }, [isOpen, shoeId, supabase]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatKilometers = (km: number) => {
    return km % 1 === 0 ? km.toString() : km.toFixed(1);
  };

  const getTotalKilometers = () => {
    return entries.reduce((total, entry) => total + entry.kilometers, 0);
  };  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet ajout ?')) {
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error: deleteError } = await supabase
        .from('manual_km')
        .delete()
        .eq('id', entryId)
        .eq('user_id', user.id);

      if (deleteError) {
        throw deleteError;
      }

      // Rafraîchir la liste en refiltrant les entrées localement
      setEntries(prevEntries => prevEntries.filter(entry => entry.id !== entryId));
      // Notifier le parent pour mettre à jour les données des chaussures
      onUpdate?.();
    } catch (err: unknown) {
      setError((err as Error).message || 'Erreur lors de la suppression');
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Arrière-plan flou */}
      <div 
        className="fixed inset-0 z-[60] bg-black/20 backdrop-blur-md transition-all duration-300 w-screen h-screen" 
        onClick={onClose}
      />
      
      {/* Contenu du modal */}
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 pointer-events-none w-screen h-screen">
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden animate-in zoom-in-95 duration-300 pointer-events-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Historique des kilomètres manuels
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {shoeName}
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex items-center justify-center w-8 h-8 bg-white hover:bg-gray-50 rounded-full shadow-md transition-all duration-200 hover:scale-105"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Corps */}
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                {error}
              </div>
            )}

            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                <p className="text-gray-500 mt-2">Chargement...</p>
              </div>
            ) : entries.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun ajout manuel</h3>
                <p className="text-gray-500">
                  Vous n&apos;avez pas encore ajouté de kilomètres manuellement pour cette chaussure.
                </p>
              </div>
            ) : (
              <>
                {/* Résumé */}
                <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-600 font-medium">Total des kilomètres manuels</p>
                      <p className="text-2xl font-bold text-blue-800">{formatKilometers(getTotalKilometers())} km</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-blue-600 font-medium">Nombre d&apos;ajouts</p>
                      <p className="text-2xl font-bold text-blue-800">{entries.length}</p>
                    </div>
                  </div>
                </div>

                {/* Liste des entrées */}
                <div className="space-y-3">
                  {entries.map((entry) => (
                    <div key={entry.id} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h4 className="font-medium text-gray-900">{entry.title}</h4>
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {formatKilometers(entry.kilometers)} km
                            </span>
                          </div>
                          
                          {entry.description && (
                            <p className="text-sm text-gray-600 mb-2">{entry.description}</p>
                          )}
                          
                          <div className="flex items-center text-xs text-gray-500 space-x-4">
                            <span>📅 {formatDate(entry.activity_date)}</span>
                            <span>🕒 Ajouté le {formatDate(entry.created_at)}</span>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => handleDeleteEntry(entry.id)}
                          className="flex items-center justify-center w-8 h-8 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all duration-200 ml-4"
                          title="Supprimer cet ajout"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
