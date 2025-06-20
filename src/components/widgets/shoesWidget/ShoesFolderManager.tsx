'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

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

interface FolderItemData {
  id: string;
  folder_id: string;
  shoe_id: string;
  order_position: number;
  shoe: Shoe;
}

interface ShoesFolderManagerProps {
  shoes: Shoe[];
}

export default function ShoesFolderManager({ shoes }: ShoesFolderManagerProps) {
  const [folders, setFolders] = useState<ShoesFolder[]>([]);
  const [folderItems, setFolderItems] = useState<{ [key: string]: FolderItem[] }>({});
  const [unorganizedShoes, setUnorganizedShoes] = useState<Shoe[]>([]);
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [newFolderForm, setNewFolderForm] = useState({
    name: '',
    description: '',
    color: '#3B82F6'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const supabase = createClientComponentClient();

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

      setFolders(foldersData || []);      // Organiser les items par dossier
      const itemsByFolder: { [key: string]: FolderItem[] } = {};
      (itemsData || []).forEach((item: FolderItemData) => {
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
      const organizedShoeIds = new Set((itemsData || []).map((item: FolderItemData) => item.shoe_id));
      const unorganized = shoes.filter(shoe => !organizedShoeIds.has(shoe.id));
      setUnorganizedShoes(unorganized);

    } catch (err: unknown) {
      setError((err as Error).message || 'Erreur lors du chargement des dossiers');
    } finally {
      setIsLoading(false);
    }
  }, [supabase, shoes]);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  const handleCreateFolder = async () => {
    if (!newFolderForm.name.trim()) {
      setError('Le nom du dossier est obligatoire');
      return;
    }

    try {
      setIsCreating(true);
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
      setIsCreating(false);
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

      // Si on déplace vers un dossier
      if (destination.droppableId.startsWith('folder-')) {
        const folderId = destination.droppableId.replace('folder-', '');
        const shoeId = draggableId.replace('shoe-', '');

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
        const shoeId = draggableId.replace('shoe-', '');
        
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

  const colorOptions = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', 
    '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
  ];

  if (isLoading) {
    return <div className="text-center py-4">Chargement des dossiers...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header avec bouton de création */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Organisation des chaussures</h2>
        <button
          onClick={() => setIsCreateFolderModalOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Créer un dossier
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid gap-6">
          {/* Dossiers */}
          {folders.map((folder) => (
            <div key={folder.id} className="border rounded-lg p-4" style={{ borderColor: folder.color }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: folder.color }}
                  ></div>
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
              </div>

              <Droppable droppableId={`folder-${folder.id}`}>
                {(provided, snapshot) => (
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
                      {(folderItems[folder.id] || []).map((item, index) => (
                        <Draggable key={item.shoe.id} draggableId={`shoe-${item.shoe.id}`} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`bg-white border rounded-lg p-3 cursor-move transition-shadow ${
                                snapshot.isDragging ? 'shadow-lg' : 'shadow-sm hover:shadow-md'
                              }`}
                            >
                              <h4 className="font-medium text-gray-900">{item.shoe.name}</h4>
                              <p className="text-sm text-gray-600">{item.shoe.total_kilometers} km</p>
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
            <h3 className="font-medium text-gray-900 mb-3">Chaussures non organisées</h3>
            <Droppable droppableId="unorganized">
              {(provided, snapshot) => (
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
                    {unorganizedShoes.map((shoe, index) => (
                      <Draggable key={shoe.id} draggableId={`shoe-${shoe.id}`} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`bg-white border rounded-lg p-3 cursor-move transition-shadow ${
                              snapshot.isDragging ? 'shadow-lg' : 'shadow-sm hover:shadow-md'
                            }`}
                          >
                            <h4 className="font-medium text-gray-900">{shoe.name}</h4>
                            <p className="text-sm text-gray-600">{shoe.total_kilometers} km</p>
                          </div>
                        )}
                      </Draggable>
                    ))}
                  </div>
                  {provided.placeholder}
                  {unorganizedShoes.length === 0 && (
                    <p className="text-gray-400 text-center py-4">
                      Toutes les chaussures sont organisées
                    </p>
                  )}
                </div>
              )}
            </Droppable>
          </div>
        </div>
      </DragDropContext>

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
                  {colorOptions.map((color) => (
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
                disabled={isCreating}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isCreating ? 'Création...' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
