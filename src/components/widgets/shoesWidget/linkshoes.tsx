import React, { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useAuth } from '@/context/AuthContext';
import Modal from '@/components/ui/Modal';

interface Activity {
  id: string;
  activity_name: string;
  distance: number;
  start_time: string;
  activity_type: string;
  shoes: string | null;
}

interface Shoe {
  id: string;
  name: string;
  manual_kilometers: number;
  auto_kilometers: number;
  total_kilometers: number;
}

interface LinkShoesProps {
  shoe: Shoe;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const LinkShoes: React.FC<LinkShoesProps> = ({
  shoe,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedActivities, setSelectedActivities] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);  const { user } = useAuth();
  const supabase = createClientComponentClient();

  const loadActivities = useCallback(async () => {
    if (!user) {
      console.log('LinkShoes: Aucun utilisateur connecté');
      return;
    }

    setLoading(true);
    try {
      console.log('LinkShoes: Chargement des activités pour l\'utilisateur:', user.id);

      const { data, error } = await supabase
        .from('garmin_activities')
        .select('id, activity_name, distance, start_time, activity_type, shoes')
        .eq('user_id', user.id)
        .order('start_time', { ascending: false });

      if (error) {
        console.error('LinkShoes: Erreur lors du chargement des activités:', error);
        throw error;
      }

      console.log('LinkShoes: Activités chargées:', data?.length || 0);
      console.log('LinkShoes: Données des activités:', data);
      setActivities(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des activités:', error);
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  useEffect(() => {
    if (isOpen && user) {
      loadActivities();
    }
  }, [isOpen, user, loadActivities]);
  const toggleActivitySelection = (activityId: string) => {
    // Empêcher la sélection d'activités déjà liées à d'autres chaussures
    const activity = activities.find(a => a.id === activityId);
    if (activity?.shoes && activity.shoes !== shoe.id) {
      return; // Ne pas permettre la sélection d'activités liées à d'autres chaussures
    }

    const newSelected = new Set(selectedActivities);
    if (newSelected.has(activityId)) {
      newSelected.delete(activityId);
    } else {
      newSelected.add(activityId);
    }
    setSelectedActivities(newSelected);
  };  const handleSubmit = async () => {
    if (selectedActivities.size === 0 || !user) return;

    setSubmitting(true);
    try {
      // Calculer le kilométrage total des activités sélectionnées
      const selectedActivitiesData = activities.filter(activity => 
        selectedActivities.has(activity.id)
      );
      // Convertir les mètres en kilomètres
      const totalKilometers = selectedActivitiesData.reduce(
        (sum, activity) => sum + (activity.distance || 0), 
        0
      ) / 1000; // Diviser par 1000 pour convertir les mètres en kilomètres      console.log('Distance totale à ajouter (km):', totalKilometers);
      console.log('Kilométrage automatique actuel de la chaussure:', shoe.auto_kilometers);

      // Mettre à jour les activités avec la chaussure
      const { error: updateError } = await supabase
        .from('garmin_activities')
        .update({ shoes: shoe.id })
        .in('id', Array.from(selectedActivities));

      if (updateError) throw updateError;

      // Mettre à jour le kilométrage automatique de la chaussure
      const { error: shoeError } = await supabase
        .from('shoes')
        .update({ 
          auto_kilometers: shoe.auto_kilometers + totalKilometers
        })
        .eq('id', shoe.id);

      if (shoeError) throw shoeError;

      onSuccess();
      onClose();
      setSelectedActivities(new Set());
    } catch (error) {
      console.error('Erreur lors de la liaison des activités:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatDistance = (distance: number) => {
    return distance ? `${(distance / 1000).toFixed(2)} km` : '0 km';
  };
  // Afficher toutes les activités avec leur statut
  const allActivities = activities;
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Lier des activités à ${shoe.name}`} size="xl">
      <div className="space-y-6">        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="space-y-3">
            <p className="text-sm text-gray-700 leading-relaxed">
              Sélectionnez les activités que vous souhaitez lier à cette chaussure.
              Le kilométrage sera automatiquement ajouté au total de la chaussure.
            </p>
            <div className="bg-white rounded-lg p-3 border border-blue-100">
              <h4 className="text-xs font-medium text-gray-600 mb-2 uppercase tracking-wide">Légende des statuts</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <span className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-gray-300 rounded-full flex-shrink-0"></div>
                  <span className="text-sm text-gray-600">Disponible pour sélection</span>
                </span>
                <span className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-green-500 rounded-full flex-shrink-0"></div>
                  <span className="text-sm text-gray-600">Déjà liée à cette chaussure</span>
                </span>
                <span className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-gray-400 rounded-full flex-shrink-0"></div>
                  <span className="text-sm text-gray-600">Liée à une autre chaussure</span>
                </span>
              </div>
            </div>
          </div>
        </div>        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600 text-lg">Chargement des activités...</p>
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg bg-gray-50 p-4">
            <div className="max-h-[50vh] overflow-y-auto">
              {allActivities.length === 0 ? (
                <div className="text-center text-gray-500 py-16">
                  <svg className="mx-auto h-16 w-16 text-gray-400 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <p className="text-xl font-medium text-gray-900 mb-3">Aucune activité trouvée</p>
                  <p className="text-base text-gray-600 max-w-md mx-auto">
                    Vos activités Garmin apparaîtront ici une fois synchronisées avec votre compte.
                  </p>
                </div>              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {allActivities.map((activity: Activity) => {
                    const isLinkedToOtherShoe = activity.shoes && activity.shoes !== shoe.id;
                    const isLinkedToCurrentShoe = activity.shoes === shoe.id;
                    const isSelectable = !isLinkedToOtherShoe;
                    
                    return (
                      <div
                        key={activity.id}
                        className={`bg-white p-3 border-2 rounded-lg transition-all duration-200 ${
                          selectedActivities.has(activity.id)
                            ? 'border-blue-300 bg-blue-50 shadow-md transform scale-[1.02]'
                            : isLinkedToCurrentShoe
                            ? 'border-green-300 bg-green-50'
                            : isLinkedToOtherShoe
                            ? 'border-gray-200 bg-gray-50 opacity-60'
                            : 'border-gray-200 hover:border-blue-200 hover:bg-blue-25 hover:shadow-sm cursor-pointer'
                        } ${isSelectable ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                        onClick={() => isSelectable && toggleActivitySelection(activity.id)}
                      >
                        <div className="flex flex-col space-y-3">
                          <div className="flex items-start justify-between">
                            <h3 className="text-sm font-semibold text-gray-900 truncate pr-2">
                              {activity.activity_name || 'Activité sans nom'}
                            </h3>
                            <div className="flex-shrink-0">
                              {isLinkedToCurrentShoe ? (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                  Liée
                                </span>
                              ) : isLinkedToOtherShoe ? (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M5 9a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
                                  </svg>
                                  Autre
                                </span>
                              ) : selectedActivities.has(activity.id) ? (
                                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              ) : (
                                <div className="w-6 h-6 border-2 border-gray-300 rounded-full"></div>
                              )}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center text-gray-600">
                              <svg className="w-3 h-3 mr-1 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                              </svg>
                              <span className="text-sm font-medium">{formatDistance(activity.distance)}</span>
                            </div>
                            <div className="flex items-center text-gray-600">
                              <svg className="w-3 h-3 mr-1 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span className="text-xs">{formatDate(activity.start_time)}</span>
                            </div>
                            <div className="flex items-center text-gray-600">
                              <svg className="w-3 h-3 mr-1 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                              </svg>
                              <span className="px-2 py-1 bg-gray-100 rounded-full text-xs font-medium truncate">
                                {activity.activity_type || 'Type inconnu'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}        {selectedActivities.size > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-5 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold text-blue-900">
                  {selectedActivities.size} activité{selectedActivities.size > 1 ? 's' : ''} sélectionnée{selectedActivities.size > 1 ? 's' : ''}
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  Kilométrage à ajouter : <span className="font-bold">{formatDistance(
                    activities
                      .filter(a => selectedActivities.has(a.id))
                      .reduce((sum, a) => sum + (a.distance || 0), 0)
                  )}</span>
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        )}        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-3 text-gray-600 hover:text-gray-800 font-medium transition-colors rounded-lg hover:bg-gray-50"
            disabled={submitting}
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={selectedActivities.size === 0 || submitting}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-sm hover:shadow-md flex items-center space-x-2"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Liaison en cours...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <span>Lier {selectedActivities.size} activité{selectedActivities.size > 1 ? 's' : ''}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};
