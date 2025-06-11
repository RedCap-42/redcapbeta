'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
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

export default function ShoesGestion() {
  const [shoes, setShoes] = useState<Shoe[]>([]);
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
    activity_date: new Date().toISOString().split('T')[0] // Date du jour par défaut
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
      setError('');    } catch (err: unknown) {
      setError((err as Error).message || 'Erreur lors du chargement des chaussures');
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchShoes();
  }, [fetchShoes]);
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
  };  const handleLinkToActivities = (shoe: Shoe) => {
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

      // Enregistrement du kilométrage manuel dans la table manual_km
      // Le trigger se chargera automatiquement de mettre à jour manual_kilometers dans shoes
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
      }      fetchShoes();
    } catch (err: unknown) {
      setError((err as Error).message || 'Erreur lors de la suppression');
    }
  };

  // Fonction pour formater les kilomètres
  const formatKilometers = (km: number) => {
    return km % 1 === 0 ? km.toString() : km.toFixed(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800">Gestion des Chaussures</h2>
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
          <p className="mt-1 text-sm text-gray-500">
            Commencez par ajouter votre première paire de chaussures de course.
          </p>
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
      ) : (        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {shoes.map((shoe) => (
            <div 
              key={shoe.id} 
              className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col h-full cursor-pointer"
              onClick={() => handleViewShoesGraph(shoe)}
            >
              {/* Header avec icône */}              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>                  <h3 className="text-lg font-semibold text-gray-900 truncate max-w-[200px]" title={shoe.name}>
                    {shoe.name}
                  </h3>
                </div>
              </div>              {/* Contenu principal - flexible pour occuper l'espace disponible */}
              <div className="p-6 flex-grow">
                {/* Description */}
                <div className="mb-4">
                  {shoe.description ? (
                    <p className="text-gray-600 text-sm leading-relaxed line-clamp-2">
                      {shoe.description}
                    </p>
                  ) : (
                    <p className="text-gray-400 text-sm italic">
                      Aucune description
                    </p>
                  )}
                </div>                {/* Statistiques */}
                <div className="space-y-3">                  {/* Kilométrage principal */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                      <span className="text-sm font-medium text-gray-700">Kilométrage</span>
                    </div>                    <div className="text-left">
                      <span className="text-xl font-bold text-blue-600">
                        {formatKilometers(shoe.total_kilometers)} km
                      </span>
                      {(shoe.manual_kilometers > 0 || shoe.auto_kilometers > 0) && (
                        <div className="text-xs text-gray-500 mt-1">
                          {shoe.manual_kilometers > 0 && (
                            <span className="mr-2">
                              📝 {formatKilometers(shoe.manual_kilometers)} km manuel
                            </span>
                          )}
                          {shoe.auto_kilometers > 0 && (
                            <span>
                              🔗 {formatKilometers(shoe.auto_kilometers)} km auto
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                      {/* Boutons d'action pour le kilométrage */}
                    <div className="mt-3 flex flex-wrap gap-2">                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddKilometers(shoe);
                        }}
                        className="flex items-center justify-center px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 transition-colors duration-200"
                        title="Ajouter manuellement des kilomètres"
                      >
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Ajouter des km manuellement
                      </button>
                      {shoe.manual_kilometers > 0 && (                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewManualKmHistory(shoe);
                          }}
                          className="flex items-center justify-center px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-md hover:bg-purple-100 transition-colors duration-200"
                          title="Voir l'historique des kilomètres manuels"
                        >
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Historique
                        </button>
                      )}                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLinkToActivities(shoe);
                        }}
                        className="flex items-center justify-center px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors duration-200"
                        title="Lier à des activités"
                      >
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        Lier à activités
                      </button>
                    </div>
                  </div>
                </div>
              </div>              {/* Footer - toujours en bas grâce à flex-shrink-0 */}
              <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <div className="flex items-center space-x-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Ajoutée le {new Date(shoe.created_at).toLocaleDateString('fr-FR')}</span>
                    </div>
                  </div>
                  
                  {/* Boutons d'action */}
                  <div className="flex items-center space-x-2">                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditShoe(shoe);
                      }}
                      className="flex items-center justify-center w-8 h-8 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all duration-200"
                      title="Modifier"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteShoe(shoe);
                      }}
                      className="flex items-center justify-center w-8 h-8 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all duration-200"
                      title="Supprimer"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal pour ajouter des kilomètres */}
      {isAddKmModalOpen && shoeForKmUpdate && (
        <>
          {/* Arrière-plan flou */}
          <div 
            className="fixed inset-0 z-[60] bg-black/20 backdrop-blur-md transition-all duration-300 w-screen h-screen" 
            onClick={handleCancelAddKm}
          />
          
          {/* Contenu du modal */}
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 pointer-events-none w-screen h-screen">
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 pointer-events-auto">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Ajouter des kilomètres
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {shoeForKmUpdate.name}
                  </p>
                </div>
                <button
                  onClick={handleCancelAddKm}
                  className="flex items-center justify-center w-8 h-8 bg-white hover:bg-gray-50 rounded-full shadow-md transition-all duration-200 hover:scale-105"
                >
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Corps */}
              <div className="p-6">
                <div className="mb-4">                  <p className="text-sm text-gray-600 mb-2">
                    Kilométrage manuel actuel: <span className="font-semibold text-blue-600">{formatKilometers(shoeForKmUpdate.manual_kilometers)} km</span>
                  </p>
                  <p className="text-sm text-gray-600 mb-2">
                    Kilométrage automatique: <span className="font-semibold text-green-600">{formatKilometers(shoeForKmUpdate.auto_kilometers)} km</span>
                  </p>
                  <p className="text-sm text-gray-600 mb-2">
                    Kilométrage total: <span className="font-semibold text-purple-600">{formatKilometers(shoeForKmUpdate.total_kilometers)} km</span>
                  </p>
                </div>

                <div>
                  <label htmlFor="km-to-add" className="block text-sm font-medium text-gray-700 mb-2">
                    Combien de km voulez-vous ajouter ?
                  </label>
                  <input
                    type="number"
                    id="km-to-add"
                    value={manualKmForm.kilometers}
                    onChange={(e) => setManualKmForm({ ...manualKmForm, kilometers: e.target.value })}
                    min="0"
                    step="0.1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Ex: 10.5"
                    autoFocus
                  />
                </div>                <div className="mt-4">
                  <label htmlFor="km-title" className="block text-sm font-medium text-gray-700 mb-2">
                    Titre *
                  </label>
                  <input
                    type="text"
                    id="km-title"
                    value={manualKmForm.title}
                    onChange={(e) => setManualKmForm({ ...manualKmForm, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Ex: Course du matin"
                    required
                  />
                </div>

                <div className="mt-4">
                  <label htmlFor="km-description" className="block text-sm font-medium text-gray-700 mb-2">
                    Description (facultatif)
                  </label>
                  <textarea
                    id="km-description"
                    value={manualKmForm.description}
                    onChange={(e) => setManualKmForm({ ...manualKmForm, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Ex: Ajout après une sortie longue"
                    rows={2}
                  />
                </div>                <div className="mt-4">
                  <label htmlFor="km-date" className="block text-sm font-medium text-gray-700 mb-2">
                    Date de l&apos;activité
                  </label>
                  <input
                    type="date"
                    id="km-date"
                    value={manualKmForm.activity_date}
                    onChange={(e) => setManualKmForm({ ...manualKmForm, activity_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                {manualKmForm.kilometers && !isNaN(parseFloat(manualKmForm.kilometers)) && parseFloat(manualKmForm.kilometers) > 0 && (
                  <div className="mt-3 p-3 bg-green-50 rounded-lg">                    <p className="text-sm text-green-800">
                      Nouveau total manuel: <span className="font-semibold">{formatKilometers(shoeForKmUpdate.manual_kilometers + parseFloat(manualKmForm.kilometers))} km</span>
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Nouveau total global: <span className="font-semibold">{formatKilometers(shoeForKmUpdate.total_kilometers + parseFloat(manualKmForm.kilometers))} km</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={handleCancelAddKm}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200"
                  >
                    Annuler
                  </button>                  <button
                    onClick={handleConfirmAddKm}
                    disabled={isAddingKm || !manualKmForm.kilometers.trim() || !manualKmForm.title.trim() || isNaN(parseFloat(manualKmForm.kilometers)) || parseFloat(manualKmForm.kilometers) <= 0}
                    className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center"
                  >
                    {isAddingKm ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Ajout...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Ajouter
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <CreateShoes
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onShoesCreated={handleShoesCreated}
      />      <EditShoes
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onShoesUpdated={handleShoesUpdated}
        shoe={selectedShoe}
      />      {shoeForLinking && (
        <LinkShoes
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
      )}      {shoeForHistory && (
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

      {/* Modal pour le graphique d'utilisation */}
      <ShoesGraph
        shoe={shoeForGraph}
        isOpen={isShoesGraphOpen}
        onClose={() => {
          setIsShoesGraphOpen(false);
          setShoeForGraph(null);
        }}
      />
    </div>
  );
}
