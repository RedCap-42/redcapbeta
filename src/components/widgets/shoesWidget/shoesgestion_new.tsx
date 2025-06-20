'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { 
  DragDropContext, 
  Droppable, 
  Draggable, 
  DropResult,
  DroppableProvided,
  DroppableStateSnapshot,
  DraggableProvided,
  DraggableStateSnapshot
} from '@hello-pangea/dnd';
import CreateShoes from './createshoes';
import EditShoes from './editshoes';
import { LinkShoes } from './linkshoes';
import ManualKmHistory from './ManualKmHistory';
import ShoesGraph from './shoesgraph';

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

interface FolderItemRecord {
  id: string;
  folder_id: string;
  shoe_id: string;
  order_position: number;
  shoe: Shoe;
}

export default function ShoesGestion() {
  const [shoes, setShoes] = useState<Shoe[]>([]);
  const [folders, setFolders] = useState<ShoesFolder[]>([]);
  const [folderItems, setFolderItems] = useState<{ [key: string]: FolderItem[] }>({});
  const [unorganizedShoes, setUnorganizedShoes] = useState<Shoe[]>([]);
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedShoe, setSelectedShoe] = useState<Shoe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // États pour l'ajout de kilomètres manuels
  const [isAddKmModalOpen, setIsAddKmModalOpen] = useState(false);
  const [shoeForKmUpdate, setShoeForKmUpdate] = useState<Shoe | null>(null);
  const [manualKmForm, setManualKmForm] = useState({
    kilometers: '',
    title: '',
    description: '',
    activity_date: new Date().toISOString().split('T')[0]
  });
  const [isAddingKm, setIsAddingKm] = useState(false);
  
  // États pour la liaison aux activités
  const [isLinkShoesModalOpen, setIsLinkShoesModalOpen] = useState(false);
  const [shoeForLinking, setShoeForLinking] = useState<Shoe | null>(null);
  
  // États pour l'historique des kilomètres manuels
  const [isManualKmHistoryOpen, setIsManualKmHistoryOpen] = useState(false);
  const [shoeForHistory, setShoeForHistory] = useState<Shoe | null>(null);
  
  // États pour le graphique d'utilisation
  const [isShoesGraphOpen, setIsShoesGraphOpen] = useState(false);
  const [shoeForGraph, setShoeForGraph] = useState<Shoe | null>(null);
  
  // États pour les dossiers
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [newFolderForm, setNewFolderForm] = useState({
    name: '',
    description: '',
    color: '#3B82F6'
  });
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  const supabase = createClientComponentClient();

  const fetchShoes = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError('Vous devez être connecté pour voir vos chaussures');
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('shoes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setShoes(data || []);
      setError('');
    } catch (err: unknown) {
      setError((err as Error).message || 'Erreur lors du chargement des chaussures');
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  const fetchFolders = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: foldersData, error: foldersError } = await supabase
        .from('shoes_folders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (foldersError) throw foldersError;

      const { data: itemsData, error: itemsError } = await supabase
        .from('shoes_folder_items')
        .select(`
          *,
          shoe:shoes(*)
        `)
        .eq('user_id', user.id)
        .order('order_position', { ascending: true });

      if (itemsError) throw itemsError;

      setFolders(foldersData || []);

      // Organiser les items par dossier
      const itemsByFolder: { [key: string]: FolderItem[] } = {};
      (itemsData || []).forEach((item: FolderItemRecord) => {
        if (!itemsByFolder[item.folder_id]) {
          itemsByFolder[item.folder_id] = [];
        }
        itemsByFolder[item.folder_id].push({
          id: item.id,
          folder_id: item.folder_id,
          shoe_id: item.shoe_id,
          order_position: item.order_position,
          shoe: item.shoe
        });
      });

      setFolderItems(itemsByFolder);

      // Chaussures non organisées
      const organizedShoeIds = new Set((itemsData || []).map((item: FolderItemRecord) => item.shoe_id));
      const unorganized = shoes.filter(shoe => !organizedShoeIds.has(shoe.id));
      setUnorganizedShoes(unorganized);

    } catch (err: unknown) {
      setError((err as Error).message || 'Erreur lors du chargement des dossiers');
    }
  }, [supabase, shoes]);

  useEffect(() => {
    fetchShoes();
  }, [fetchShoes]);

  useEffect(() => {
    if (shoes.length > 0) {
      fetchFolders();
    }
  }, [fetchFolders, shoes]);

  const handleCreateFolder = async () => {
    if (!newFolderForm.name.trim()) {
      setError('Le nom du dossier est obligatoire');
      return;
    }

    try {
      setIsCreatingFolder(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Vous devez être connecté');
        return;
      }

      const { error: createError } = await supabase
        .from('shoes_folders')
        .insert({
          user_id: user.id,
          name: newFolderForm.name.trim(),
          description: newFolderForm.description.trim() || null,
          color: newFolderForm.color
        });

      if (createError) throw createError;

      setIsCreateFolderModalOpen(false);
      setNewFolderForm({ name: '', description: '', color: '#3B82F6' });
      fetchFolders();
    } catch (err: unknown) {
      setError((err as Error).message || 'Erreur lors de la création du dossier');
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleDeleteFolder = async (folder: ShoesFolder) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le dossier "${folder.name}" ?`)) {
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error: deleteError } = await supabase
        .from('shoes_folders')
        .delete()
        .eq('id', folder.id)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      fetchFolders();
    } catch (err: unknown) {
      setError((err as Error).message || 'Erreur lors de la suppression du dossier');
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    const { destination, draggableId } = result;

    if (!destination) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const shoeId = draggableId.replace('shoe-', '');

      // Si on déplace vers un dossier
      if (destination.droppableId.startsWith('folder-')) {
        const folderId = destination.droppableId.replace('folder-', '');

        // Supprimer l'item de son ancien dossier s'il en avait un
        await supabase
          .from('shoes_folder_items')
          .delete()
          .eq('shoe_id', shoeId)
          .eq('user_id', user.id);

        // Ajouter au nouveau dossier
        await supabase
          .from('shoes_folder_items')
          .insert({
            user_id: user.id,
            folder_id: folderId,
            shoe_id: shoeId,
            order_position: destination.index
          });

      } else if (destination.droppableId === 'unorganized') {
        // Si on déplace vers les chaussures non organisées
        await supabase
          .from('shoes_folder_items')
          .delete()
          .eq('shoe_id', shoeId)
          .eq('user_id', user.id);
      }

      fetchFolders();
    } catch (err: unknown) {
      setError((err as Error).message || 'Erreur lors du déplacement');
    }
  };

  const formatKilometers = (km: number): string => {
    return km.toFixed(1);
  };

  const handleShoesCreated = () => {
    fetchShoes();
  };

  const handleShoesUpdated = () => {
    fetchShoes();
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

  const handleLinkToActivities = (shoe: Shoe) => {
    setShoeForLinking(shoe);
    setIsLinkShoesModalOpen(true);
  };

  const handleViewManualKmHistory = (shoe: Shoe) => {
    setShoeForHistory(shoe);
    setIsManualKmHistoryOpen(true);
  };

  const handleViewShoesGraph = (shoe: Shoe) => {
    setShoeForGraph(shoe);
    setIsShoesGraphOpen(true);
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
      fetchShoes();
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

  const handleEditShoe = (shoe: Shoe) => {
    setSelectedShoe(shoe);
    setIsEditModalOpen(true);
  };

  const handleDeleteShoe = async (shoe: Shoe) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer "${shoe.name}" ?`)) {
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

      fetchShoes();
    } catch (err: unknown) {
      setError((err as Error).message || 'Erreur lors de la suppression');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800">Gestion des Chaussures</h2>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsCreateFolderModalOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Créer un dossier
          </button>
          
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Ajouter une chaussure
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Chargement...</p>
        </div>
      ) : shoes.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Aucune chaussure</h3>
          <p className="mt-1 text-sm text-gray-500">Commencez par ajouter votre première chaussure.</p>
          <div className="mt-6">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Ajouter ma première chaussure
            </button>
          </div>
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="space-y-6">
            {/* Dossiers */}
            {folders.map((folder) => (
              <div key={folder.id} className="border rounded-lg p-4" style={{ borderColor: folder.color }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-6 h-6 rounded flex items-center justify-center"
                      style={{ backgroundColor: folder.color }}
                    >
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                      </svg>
                    </div>
                    <h3 className="font-medium text-gray-900">{folder.name}</h3>
                    {folder.description && (
                      <span className="text-sm text-gray-500">- {folder.description}</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteFolder(folder)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Supprimer
                  </button>
                </div>                <Droppable droppableId={`folder-${folder.id}`}>
                  {(provided: DroppableProvided, snapshot: DroppableStateSnapshot) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className={`min-h-20 p-3 rounded-lg border-2 border-dashed transition-colors ${
                        snapshot.isDraggingOver 
                          ? 'border-blue-400 bg-blue-50' 
                          : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {(folderItems[folder.id] || []).map((item, index) => (                        <Draggable key={item.shoe.id} draggableId={`shoe-${item.shoe.id}`} index={index}>
                            {(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`bg-white border rounded-lg p-3 cursor-move transition-shadow ${
                                  snapshot.isDragging ? 'shadow-lg' : 'shadow-sm hover:shadow-md'
                                }`}
                                onClick={() => handleViewShoesGraph(item.shoe)}
                              >
                                <h4 className="font-medium text-gray-900">{item.shoe.name}</h4>
                                <p className="text-sm text-gray-600">{formatKilometers(item.shoe.total_kilometers)} km</p>
                              </div>
                            )}
                          </Draggable>
                        ))}
                      </div>
                      {provided.placeholder}
                      {(!folderItems[folder.id] || folderItems[folder.id].length === 0) && (
                        <p className="text-gray-400 text-center py-4">
                          Glissez des chaussures ici pour les organiser
                        </p>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}

            {/* Chaussures non organisées */}
            <div className="border rounded-lg p-4 border-gray-300">
              <h3 className="font-medium text-gray-900 mb-3">
                {folders.length > 0 ? 'Chaussures non organisées' : 'Mes chaussures'}
              </h3>              <Droppable droppableId="unorganized">
                {(provided: DroppableProvided, snapshot: DroppableStateSnapshot) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className={`min-h-20 p-3 rounded-lg border-2 border-dashed transition-colors ${
                      snapshot.isDraggingOver 
                        ? 'border-blue-400 bg-blue-50' 
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {unorganizedShoes.map((shoe, index) => (                        <Draggable key={shoe.id} draggableId={`shoe-${shoe.id}`} index={index}>
                          {(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col h-full cursor-move ${
                                snapshot.isDragging ? 'shadow-lg' : ''
                              }`}
                            >
                              {/* Header avec icône */}
                              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-100">
                                <div className="flex items-center space-x-3">
                                  <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                  </div>
                                  <h3 className="text-lg font-semibold text-gray-900 truncate max-w-[200px]" title={shoe.name}>
                                    {shoe.name}
                                  </h3>
                                </div>
                              </div>

                              {/* Contenu principal */}
                              <div className="p-6 flex-grow">
                                {/* Description */}
                                {shoe.description && (
                                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                                    {shoe.description}
                                  </p>
                                )}

                                {/* Kilomètres */}
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-700">Total</span>
                                    <span className="text-xl font-bold text-blue-600">
                                      {formatKilometers(shoe.total_kilometers)} km
                                    </span>
                                  </div>

                                  {(shoe.manual_kilometers > 0 || shoe.auto_kilometers > 0) && (
                                    <div className="text-xs text-gray-500 space-y-1">
                                      {shoe.manual_kilometers > 0 && (
                                        <div className="flex items-center justify-between">
                                          <span>📝 {formatKilometers(shoe.manual_kilometers)} km manuel</span>
                                        </div>
                                      )}
                                      {shoe.auto_kilometers > 0 && (
                                        <div className="flex items-center justify-between">
                                          <span>🔗 {formatKilometers(shoe.auto_kilometers)} km auto</span>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAddKilometers(shoe);
                                    }}
                                    className="flex-1 text-xs px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors duration-200 font-medium"
                                    title="Ajouter des kilomètres manuellement"
                                  >
                                    + KM
                                  </button>
                                  
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleLinkToActivities(shoe);
                                    }}
                                    className="flex-1 text-xs px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors duration-200 font-medium"
                                    title="Lier aux activités"
                                  >
                                    🔗 Lier
                                  </button>
                                  
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleViewManualKmHistory(shoe);
                                    }}
                                    className="flex-1 text-xs px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors duration-200 font-medium"
                                    title="Voir l'historique"
                                  >
                                    📊 Hist.
                                  </button>
                                  
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditShoe(shoe);
                                    }}
                                    className="flex-1 text-xs px-3 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors duration-200 font-medium"
                                    title="Modifier"
                                  >
                                    ✏️ Edit
                                  </button>
                                  
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteShoe(shoe);
                                    }}
                                    className="flex-1 text-xs px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors duration-200 font-medium"
                                    title="Supprimer"
                                  >
                                    🗑️ Sup.
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                    </div>
                    {provided.placeholder}
                    {unorganizedShoes.length === 0 && folders.length > 0 && (
                      <p className="text-gray-400 text-center py-4">
                        Toutes les chaussures sont organisées dans des dossiers
                      </p>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          </div>
        </DragDropContext>
      )}

      {/* Modal de création de dossier */}
      {isCreateFolderModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Créer un nouveau dossier</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom du dossier *
                </label>
                <input
                  type="text"
                  value={newFolderForm.name}
                  onChange={(e) => setNewFolderForm({ ...newFolderForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="ex: Chaussures de trail"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optionnel)
                </label>
                <input
                  type="text"
                  value={newFolderForm.description}
                  onChange={(e) => setNewFolderForm({ ...newFolderForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Description du dossier"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Couleur
                </label>
                <div className="flex space-x-2">
                  {['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'].map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewFolderForm({ ...newFolderForm, color })}
                      className={`w-8 h-8 rounded-full border-2 ${
                        newFolderForm.color === color ? 'border-gray-800' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setIsCreateFolderModalOpen(false);
                  setNewFolderForm({ name: '', description: '', color: '#3B82F6' });
                  setError('');
                }}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleCreateFolder}
                disabled={isCreatingFolder}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isCreatingFolder ? 'Création...' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modaux pour les chaussures */}
      <CreateShoes
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onShoesCreated={handleShoesCreated}
      />

      <EditShoes
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onShoesUpdated={handleShoesUpdated}
        shoe={selectedShoe}
      />

      {shoeForLinking && (        <LinkShoes
          shoe={shoeForLinking}
          isOpen={isLinkShoesModalOpen}
          onClose={() => {
            setIsLinkShoesModalOpen(false);
            setShoeForLinking(null);
          }}
          onSuccess={() => {
            fetchShoes();
          }}
        />
      )}

      {shoeForHistory && (
        <ManualKmHistory
          shoeId={shoeForHistory.id}
          shoeName={shoeForHistory.name}
          isOpen={isManualKmHistoryOpen}
          onClose={() => {
            setIsManualKmHistoryOpen(false);
            setShoeForHistory(null);
          }}
          onUpdate={() => {
            fetchShoes();
          }}
        />
      )}

      <ShoesGraph
        shoe={shoeForGraph}
        isOpen={isShoesGraphOpen}
        onClose={() => {
          setIsShoesGraphOpen(false);
          setShoeForGraph(null);
        }}
      />

      {/* Modal pour ajouter des kilomètres manuels */}
      {isAddKmModalOpen && shoeForKmUpdate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Ajouter des kilomètres - {shoeForKmUpdate.name}
            </h3>
            
            <div className="space-y-4">
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

              <div>                <label className="block text-sm font-medium text-gray-700 mb-1">
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

              <div>                <label className="block text-sm font-medium text-gray-700 mb-1">
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

            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleCancelAddKm}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmAddKm}
                disabled={isAddingKm}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isAddingKm ? 'Ajout...' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
