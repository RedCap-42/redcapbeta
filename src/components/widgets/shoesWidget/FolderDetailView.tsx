'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface Shoe {
  id: string;
  name: string;
  description: string | null;
  manual_kilometers: number;
  auto_kilometers: number;
  total_kilometers: number;
  created_at: string;
  updated_at: string;
}

interface ShoesFolder {
  id: string;
  name: string;
  description: string | null;
  color: string;
  created_at: string;
  updated_at: string;
}

interface FolderItem {
  id: string;
  folder_id: string;
  shoe_id: string;
  order_position: number;
  shoe: Shoe;
}

interface FolderDetailViewProps {
  folder: ShoesFolder;
  items: FolderItem[];
  onClose: () => void;
  onRefresh: () => void;
  onAddKm: (shoe: Shoe) => void;
  onEditShoe: (shoe: Shoe) => void;
  onLinkShoe: (shoe: Shoe) => void;
  onViewHistory: (shoe: Shoe) => void;
  onViewGraph: (shoe: Shoe) => void;
}

export default function FolderDetailView({
  folder,
  items,
  onClose,
  onRefresh,
  onAddKm,
  onEditShoe,
  onLinkShoe,
  onViewHistory,
  onViewGraph
}: FolderDetailViewProps) {
  const [isRemoving, setIsRemoving] = useState<string | null>(null);
  const [error, setError] = useState('');
  const supabase = createClientComponentClient();

  const handleRemoveFromFolder = async (item: FolderItem) => {
    if (!confirm(`Retirer "${item.shoe.name}" de ce dossier ?`)) {
      return;
    }

    try {
      setIsRemoving(item.id);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error: deleteError } = await supabase
        .from('shoes_folder_items')
        .delete()
        .eq('id', item.id)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      onRefresh();
      setError('');
    } catch (err: unknown) {
      setError((err as Error).message || 'Erreur lors du retrait de la chaussure');
    } finally {
      setIsRemoving(null);
    }
  };

  const handleDeleteShoe = async (shoe: Shoe) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer définitivement "${shoe.name}" ?`)) {
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error: deleteError } = await supabase
        .from('shoes')
        .delete()
        .eq('id', shoe.id)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      onRefresh();
      setError('');
    } catch (err: unknown) {
      setError((err as Error).message || 'Erreur lors de la suppression de la chaussure');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const getKilometerColor = (totalKm: number) => {
    if (totalKm < 100) return 'text-green-600';
    if (totalKm < 300) return 'text-yellow-600';
    if (totalKm < 500) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Fond flou */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      {/* Contenu du modal */}
      <div className="relative z-10 w-full max-w-6xl max-h-[90vh] bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden">
        {/* Header */}
        <div 
          className="p-6 border-b border-gray-200 dark:border-gray-700"
          style={{ backgroundColor: folder.color + '20' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div 
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: folder.color }}
              />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {folder.name}
                </h2>
                {folder.description && (
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    {folder.description}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {error && (
            <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}
        </div>

        {/* Contenu scrollable */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Aucune chaussure dans ce dossier
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Glissez-déposez des chaussures depuis la vue principale pour les organiser ici.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">              {items.map((item) => (                <div
                  key={item.id}
                  className="bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden transition-all duration-200"
                  style={{ 
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    transition: 'all 0.2s ease-in-out'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.25)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {/* Header de la carte */}
                  <div className="p-4 bg-white dark:bg-gray-700">
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white truncate">
                      {item.shoe.name}
                    </h3>
                    {item.shoe.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
                        {item.shoe.description}
                      </p>
                    )}
                  </div>

                  {/* Statistiques */}
                  <div className="p-4">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="text-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
                        <p className={`text-lg font-bold ${getKilometerColor(item.shoe.total_kilometers)}`}>
                          {item.shoe.total_kilometers.toFixed(1)} km
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Manuel</p>
                        <p className="text-lg font-bold text-blue-600">
                          {item.shoe.manual_kilometers.toFixed(1)} km
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Auto</p>
                        <p className="text-lg font-bold text-green-600">
                          {item.shoe.auto_kilometers.toFixed(1)} km
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Créée le</p>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {formatDate(item.shoe.created_at)}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-1">
                      <button
                        onClick={() => onAddKm(item.shoe)}
                        className="flex-1 min-w-0 px-2 py-1 text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 rounded transition-colors"
                        title="Ajouter des kilomètres"
                      >
                        + km
                      </button>
                      
                      <button
                        onClick={() => onViewHistory(item.shoe)}
                        className="flex-1 min-w-0 px-2 py-1 text-xs bg-green-100 text-green-700 hover:bg-green-200 rounded transition-colors"
                        title="Historique des kilomètres"
                      >
                        Hist.
                      </button>
                      
                      <button
                        onClick={() => onViewGraph(item.shoe)}
                        className="flex-1 min-w-0 px-2 py-1 text-xs bg-purple-100 text-purple-700 hover:bg-purple-200 rounded transition-colors"
                        title="Graphique d'utilisation"
                      >
                        Graph.
                      </button>
                      
                      <button
                        onClick={() => onLinkShoe(item.shoe)}
                        className="flex-1 min-w-0 px-2 py-1 text-xs bg-yellow-100 text-yellow-700 hover:bg-yellow-200 rounded transition-colors"
                        title="Lier aux activités"
                      >
                        Lier
                      </button>
                      
                      <button
                        onClick={() => onEditShoe(item.shoe)}
                        className="flex-1 min-w-0 px-2 py-1 text-xs bg-gray-100 text-gray-700 hover:bg-gray-200 rounded transition-colors"
                        title="Modifier"
                      >
                        Mod.
                      </button>
                    </div>

                    {/* Actions avancées */}
                    <div className="flex gap-1 mt-2">
                      <button
                        onClick={() => handleRemoveFromFolder(item)}
                        disabled={isRemoving === item.id}
                        className="flex-1 px-2 py-1 text-xs bg-orange-100 text-orange-700 hover:bg-orange-200 rounded transition-colors disabled:opacity-50"
                        title="Retirer du dossier"
                      >
                        {isRemoving === item.id ? 'Retrait...' : 'Retirer'}
                      </button>
                      
                      <button
                        onClick={() => handleDeleteShoe(item.shoe)}
                        className="flex-1 px-2 py-1 text-xs bg-red-100 text-red-700 hover:bg-red-200 rounded transition-colors"
                        title="Supprimer définitivement"
                      >
                        Suppr.
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
