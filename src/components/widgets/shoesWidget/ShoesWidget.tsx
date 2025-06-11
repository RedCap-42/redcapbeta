import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useAuth } from '@/context/AuthContext';
import Modal from '@/components/ui/Modal';

interface Shoe {
  id: string;
  name: string;
  description?: string;
  manual_kilometers: number;
  auto_kilometers: number;
  total_kilometers: number;
  created_at: string;
  updated_at: string;
}

export default function ShoesWidget() {
  const [shoes, setShoes] = useState<Shoe[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingShoe, setEditingShoe] = useState<Shoe | null>(null);
  const [newShoeName, setNewShoeName] = useState('');
  const [newShoeDescription, setNewShoeDescription] = useState('');
  const [editShoeName, setEditShoeName] = useState('');
  const [editShoeDescription, setEditShoeDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const supabase = createClientComponentClient();

  // Charger les chaussures
  const loadShoes = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('shoes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erreur lors du chargement des chaussures:', error);
        setError('Erreur lors du chargement des chaussures');
      } else {
        setShoes(data || []);
      }
    } catch (err) {
      console.error('Erreur:', err);
      setError('Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  useEffect(() => {
    loadShoes();
  }, [loadShoes]);

  // Créer une nouvelle chaussure
  const createShoe = async () => {
    if (!user || !newShoeName.trim()) return;

    setIsCreating(true);
    setError(null);

    try {      const { data, error } = await supabase
        .from('shoes')
        .insert([
          {
            user_id: user.id,
            name: newShoeName.trim(),
            description: newShoeDescription.trim() || null,
            manual_kilometers: 0,
            auto_kilometers: 0
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('Erreur lors de la création de la chaussure:', error);
        setError('Erreur lors de la création de la chaussure');
      } else {
        setShoes(prev => [data, ...prev]);
        setNewShoeName('');
        setNewShoeDescription('');
        setIsModalOpen(false);
      }
    } catch (err) {
      console.error('Erreur:', err);
      setError('Erreur inconnue');
    } finally {
      setIsCreating(false);
    }
  };
  // Mettre à jour le kilométrage manuel d'une chaussure
  const updateKilometers = async (shoeId: string, manual_kilometers: number) => {
    if (!user || manual_kilometers < 0) return;

    try {
      const { error } = await supabase
        .from('shoes')
        .update({ manual_kilometers })
        .eq('id', shoeId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Erreur lors de la mise à jour:', error);
        setError('Erreur lors de la mise à jour');
      } else {
        setShoes(prev => 
          prev.map(shoe => 
            shoe.id === shoeId 
              ? { ...shoe, manual_kilometers } 
              : shoe
          )
        );
      }
    } catch (err) {
      console.error('Erreur:', err);
      setError('Erreur inconnue');
    }
  };

  // Supprimer une chaussure
  const deleteShoe = async (shoeId: string) => {
    if (!user) return;

    if (!confirm('Êtes-vous sûr de vouloir supprimer cette chaussure ?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('shoes')
        .delete()
        .eq('id', shoeId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Erreur lors de la suppression:', error);
        setError('Erreur lors de la suppression');
      } else {
        setShoes(prev => prev.filter(shoe => shoe.id !== shoeId));
      }
    } catch (err) {
      console.error('Erreur:', err);
      setError('Erreur inconnue');
    }
  };

  // Ouvrir le modal de création
  const openModal = () => {
    setNewShoeName('');
    setNewShoeDescription('');
    setError(null);
    setIsModalOpen(true);
  };

  // Fermer le modal de création
  const closeModal = () => {
    setIsModalOpen(false);
    setNewShoeName('');
    setNewShoeDescription('');
    setError(null);
  };

  // Ouvrir le modal d'édition
  const openEditModal = (shoe: Shoe) => {
    setEditingShoe(shoe);
    setEditShoeName(shoe.name);
    setEditShoeDescription(shoe.description || '');
    setError(null);
    setIsEditModalOpen(true);
  };

  // Fermer le modal d'édition
  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingShoe(null);
    setEditShoeName('');
    setEditShoeDescription('');
    setError(null);
  };

  // Mettre à jour les informations d'une chaussure
  const updateShoeInfo = async () => {
    if (!user || !editingShoe || !editShoeName.trim()) return;

    setIsCreating(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('shoes')
        .update({
          name: editShoeName.trim(),
          description: editShoeDescription.trim() || undefined
        })
        .eq('id', editingShoe.id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Erreur lors de la mise à jour:', error);
        setError('Erreur lors de la mise à jour');
      } else {
        setShoes(prev => 
          prev.map(shoe => 
            shoe.id === editingShoe.id 
              ? { ...shoe, name: editShoeName.trim(), description: editShoeDescription.trim() || undefined }
              : shoe
          )
        );
        closeEditModal();
      }
    } catch (err) {
      console.error('Erreur:', err);
      setError('Erreur inconnue');
    } finally {
      setIsCreating(false);
    }
  };

  if (loading) {
    return <div className="text-center p-4">Chargement...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800">Mes Chaussures</h2>
        <button
          onClick={openModal}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Ajouter
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}      {shoes.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>Aucune chaussure enregistrée</p>
          <p className="text-sm">Cliquez sur &quot;Ajouter&quot; pour commencer</p>
        </div>
      ) : (
        <div className="space-y-3">
          {shoes.map((shoe) => (
            <div
              key={shoe.id}
              className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800">{shoe.name}</h3>
                  {shoe.description && (
                    <p className="text-sm text-gray-600 mt-1">{shoe.description}</p>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => openEditModal(shoe)}
                    className="p-1 text-gray-500 hover:text-blue-600 transition-colors"
                    title="Modifier"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => deleteShoe(shoe.id)}
                    className="p-1 text-gray-500 hover:text-red-600 transition-colors"
                    title="Supprimer"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
                <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">
                  Kilométrage total:
                </label>
                <div className="flex items-center space-x-1 text-sm">
                  <span className="text-blue-600 font-medium">{shoe.manual_kilometers.toFixed(1)}</span>
                  <span className="text-gray-400">+</span>
                  <span className="text-green-600 font-medium">{shoe.auto_kilometers.toFixed(1)}</span>
                  <span className="text-gray-400">=</span>
                  <span className="font-bold text-purple-600">{shoe.total_kilometers.toFixed(1)} km</span>
                </div>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={shoe.manual_kilometers}
                  onChange={(e) => updateKilometers(shoe.id, parseFloat(e.target.value) || 0)}
                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                  title="Modifier le kilométrage manuel"
                />
                <span className="text-xs text-gray-500">km (manuel)</span>
              </div></div>
          ))}
        </div>
      )}

      {/* Modal de création */}
      <Modal isOpen={isModalOpen} onClose={closeModal} title="Ajouter une chaussure">
        <div className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom de la chaussure *
              </label>
              <input
                type="text"
                value={newShoeName}
                onChange={(e) => setNewShoeName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ex: Nike Air Zoom Pegasus"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (optionnel)
              </label>
              <textarea
                value={newShoeDescription}
                onChange={(e) => setNewShoeDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Couleur, taille, utilisation..."
              />
            </div>
          </div>          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={closeModal}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={createShoe}
              disabled={!newShoeName.trim() || isCreating}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isCreating ? 'Création...' : 'Créer'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal d'édition */}
      <Modal isOpen={isEditModalOpen} onClose={closeEditModal} title="Modifier la chaussure">
        <div className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom de la chaussure *
              </label>
              <input
                type="text"
                value={editShoeName}
                onChange={(e) => setEditShoeName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ex: Nike Air Zoom Pegasus"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (optionnel)
              </label>
              <textarea
                value={editShoeDescription}
                onChange={(e) => setEditShoeDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Couleur, taille, utilisation..."
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={closeEditModal}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={updateShoeInfo}
              disabled={!editShoeName.trim() || isCreating}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isCreating ? 'Modification...' : 'Modifier'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
