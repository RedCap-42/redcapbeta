'use client';

import { useState, useEffect, useCallback } from 'react';
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

interface FolderViewProps {
  folder: ShoesFolder;
  isOpen: boolean;
  onClose: () => void;
  onShoeUpdate?: () => void;
}

export default function FolderView({ folder, isOpen, onClose, onShoeUpdate }: FolderViewProps) {
  const [folderItems, setFolderItems] = useState<FolderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // États pour les actions sur les chaussures
  const [isAddKmModalOpen, setIsAddKmModalOpen] = useState(false);
  const [shoeForKmUpdate, setShoeForKmUpdate] = useState<Shoe | null>(null);
  const [manualKmForm, setManualKmForm] = useState({
    kilometers: '',
    title: '',
    description: '',
    activity_date: new Date().toISOString().split('T')[0]
  });
  const [isAddingKm, setIsAddingKm] = useState(false);

  const supabase = createClientComponentClient();

  const fetchFolderItems = useCallback(async () => {
    if (!folder?.id) return;

    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: itemsData, error: itemsError } = await supabase
        .from('shoes_folder_items')
        .select(`
          *,
          shoe:shoes(*)
        `)
        .eq('user_id', user.id)
        .eq('folder_id', folder.id)
        .order('order_position', { ascending: true });

      if (itemsError) throw itemsError;

      setFolderItems(itemsData || []);
    } catch (err: unknown) {
      setError((err as Error).message || 'Erreur lors du chargement des chaussures');
    } finally {
      setIsLoading(false);
    }
  }, [supabase, folder?.id]);

  useEffect(() => {
    if (isOpen && folder?.id) {
      fetchFolderItems();
    }
  }, [isOpen, folder?.id, fetchFolderItems]);

  const formatKilometers = (km: number): string => {
    return km.toFixed(1);
  };

  const handleAddKilometers = (shoe: Shoe) => {
    setShoeForKmUpdate(shoe);
    setManualKmForm({
      kilometers: '',
      title: '',
      description: '',
      activity_date: new Date().toISOString().split('T')[0]
    });
    setIsAddKmModalOpen(true);
  };

  const handleConfirmAddKm = async () => {
    if (!shoeForKmUpdate || !manualKmForm.kilometers.trim() || !manualKmForm.title.trim()) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const kmValue = parseFloat(manualKmForm.kilometers);
    if (isNaN(kmValue) || kmValue <= 0) {
      setError('Veuillez entrer un nombre valide de kilomètres');
      return;
    }

    try {
      setIsAddingKm(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError('Vous devez être connecté pour modifier une chaussure');
        return;
      }

      const { error: manualKmError } = await supabase
        .from('manual_km')
        .insert({
          user_id: user.id,
          shoe_id: shoeForKmUpdate.id,
          kilometers: kmValue,
          title: manualKmForm.title,
          description: manualKmForm.description || null,
          activity_date: manualKmForm.activity_date
        });

      if (manualKmError) {
        throw manualKmError;
      }

      setIsAddKmModalOpen(false);
      setShoeForKmUpdate(null);
      setManualKmForm({
        kilometers: '',
        title: '',
        description: '',
        activity_date: new Date().toISOString().split('T')[0]
      });
      
      // Rafraîchir les données
      fetchFolderItems();
      onShoeUpdate?.();
    } catch (err: unknown) {
      setError((err as Error).message || 'Erreur lors de l\'ajout des kilomètres');
    } finally {
      setIsAddingKm(false);
    }
  };

  const handleCancelAddKm = () => {
    setIsAddKmModalOpen(false);
    setShoeForKmUpdate(null);
    setManualKmForm({
      kilometers: '',
      title: '',
      description: '',
      activity_date: new Date().toISOString().split('T')[0]
    });
    setError('');
  };

  const handleRemoveFromFolder = async (shoe: Shoe) => {
    if (!confirm(`Retirer "${shoe.name}" de ce dossier ?`)) {
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error: deleteError } = await supabase
        .from('shoes_folder_items')
        .delete()
        .eq('shoe_id', shoe.id)
        .eq('folder_id', folder.id)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      fetchFolderItems();
      onShoeUpdate?.();
    } catch (err: unknown) {
      setError((err as Error).message || 'Erreur lors de la suppression');
    }
  };

  const handleDeleteShoe = async (shoe: Shoe) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer définitivement "${shoe.name}" ?`)) {
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError('Vous devez être connecté pour supprimer une chaussure');
        return;
      }

      const { error: deleteError } = await supabase
        .from('shoes')
        .delete()
        .eq('id', shoe.id)
        .eq('user_id', user.id);

      if (deleteError) {
        throw deleteError;
      }

      fetchFolderItems();
      onShoeUpdate?.();
    } catch (err: unknown) {
      setError((err as Error).message || 'Erreur lors de la suppression');
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Arrière-plan flou */}
      <div 
        className="fixed inset-0 z-[80] bg-black/20 backdrop-blur-md transition-all duration-300 w-screen h-screen" 
        onClick={onClose}
      />
      
      {/* Contenu principal */}
      <div className="fixed inset-0 z-[90] overflow-hidden w-screen h-screen">
        <div className="h-full flex flex-col bg-white">
          {/* Header */}
          <div 
            className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100"
            style={{ 
              backgroundImage: `linear-gradient(135deg, ${folder.color}15, ${folder.color}05)`,
              borderBottomColor: `${folder.color}30`
            }}
          >
            <div className="flex items-center space-x-4">
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/50 transition-colors"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <div className="flex items-center space-x-3">
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm"
                  style={{ backgroundColor: folder.color }}
                >
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                  </svg>
                </div>
                
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{folder.name}</h1>
                  {folder.description && (
                    <p className="text-gray-600 mt-1">{folder.description}</p>
                  )}
                  <p className="text-sm text-gray-500 mt-1">
                    {folderItems.length} chaussure{folderItems.length > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Contenu */}
          <div className="flex-1 overflow-auto p-6">
            {error && (
              <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                {error}
              </div>
            )}

            {isLoading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-gray-600">Chargement...</p>
              </div>
            ) : folderItems.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <div 
                  className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4"
                  style={{ backgroundColor: `${folder.color}20` }}
                >
                  <svg className="w-8 h-8" style={{ color: folder.color }} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900">Dossier vide</h3>
                <p className="mt-1 text-gray-500">
                  Glissez des chaussures depuis la page principale pour les organiser ici.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {folderItems.map((item) => (
                  <div 
                    key={item.shoe.id} 
                    className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-200 overflow-hidden flex flex-col h-full group"
                  >
                    {/* Header avec icône */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-100">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 truncate flex-1" title={item.shoe.name}>
                          {item.shoe.name}
                        </h3>
                      </div>
                    </div>

                    {/* Contenu principal */}
                    <div className="p-6 flex-grow">
                      {/* Description */}
                      {item.shoe.description && (
                        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                          {item.shoe.description}
                        </p>
                      )}

                      {/* Kilomètres */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">Total</span>
                          <span className="text-xl font-bold text-blue-600">
                            {formatKilometers(item.shoe.total_kilometers)} km
                          </span>
                        </div>

                        {(item.shoe.manual_kilometers > 0 || item.shoe.auto_kilometers > 0) && (
                          <div className="text-xs text-gray-500 space-y-1">
                            {item.shoe.manual_kilometers > 0 && (
                              <div className="flex items-center justify-between">
                                <span>📝 {formatKilometers(item.shoe.manual_kilometers)} km manuel</span>
                              </div>
                            )}
                            {item.shoe.auto_kilometers > 0 && (
                              <div className="flex items-center justify-between">
                                <span>🔗 {formatKilometers(item.shoe.auto_kilometers)} km auto</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <button
                          onClick={() => handleAddKilometers(item.shoe)}
                          className="text-xs px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors duration-200 font-medium"
                          title="Ajouter des kilomètres"
                        >
                          + KM
                        </button>
                        
                        <button
                          onClick={() => handleRemoveFromFolder(item.shoe)}
                          className="text-xs px-3 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors duration-200 font-medium"
                          title="Retirer du dossier"
                        >
                          📤 Sortir
                        </button>
                        
                        <button
                          onClick={() => handleDeleteShoe(item.shoe)}
                          className="text-xs px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors duration-200 font-medium"
                          title="Supprimer définitivement"
                        >
                          🗑️ Sup.
                        </button>
                      </div>
                      
                      <div className="text-xs text-gray-400 text-center">
                        Ajoutée le {new Date(item.shoe.created_at).toLocaleDateString('fr-FR')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal pour ajouter des kilomètres */}
      {isAddKmModalOpen && shoeForKmUpdate && (
        <>
          <div 
            className="fixed inset-0 z-[100] bg-black/20 backdrop-blur-md transition-all duration-300" 
            onClick={handleCancelAddKm}
          />
          
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 pointer-events-none">
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 pointer-events-auto">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Ajouter des kilomètres</h3>
                  <p className="text-sm text-gray-600 mt-1">{shoeForKmUpdate.name}</p>
                </div>
                <button
                  onClick={handleCancelAddKm}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Stats actuelles */}
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <div className="grid grid-cols-3 gap-4 text-center text-sm">
                  <div>
                    <p className="text-gray-500">Manuel</p>
                    <p className="font-semibold text-green-600">{formatKilometers(shoeForKmUpdate.manual_kilometers)} km</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Auto</p>
                    <p className="font-semibold text-blue-600">{formatKilometers(shoeForKmUpdate.auto_kilometers)} km</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Total</p>
                    <p className="font-semibold text-purple-600">{formatKilometers(shoeForKmUpdate.total_kilometers)} km</p>
                  </div>
                </div>
              </div>

              {/* Formulaire */}
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kilomètres *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={manualKmForm.kilometers}
                    onChange={(e) => setManualKmForm({ ...manualKmForm, kilometers: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Distance en km"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Titre de l&apos;activité *
                  </label>
                  <input
                    type="text"
                    value={manualKmForm.title}
                    onChange={(e) => setManualKmForm({ ...manualKmForm, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="ex: Course du matin"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (optionnel)
                  </label>
                  <textarea
                    value={manualKmForm.description}
                    onChange={(e) => setManualKmForm({ ...manualKmForm, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Description de l'activité"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date de l&apos;activité
                  </label>
                  <input
                    type="date"
                    value={manualKmForm.activity_date}
                    onChange={(e) => setManualKmForm({ ...manualKmForm, activity_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Boutons d'action */}
              <div className="flex space-x-3 px-6 py-4 bg-gray-50 border-t border-gray-200">
                <button
                  onClick={handleCancelAddKm}
                  className="flex-1 px-4 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Annuler
                </button>
                <button
                  onClick={handleConfirmAddKm}
                  disabled={isAddingKm}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
                >
                  {isAddingKm ? 'Ajout...' : 'Ajouter'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
