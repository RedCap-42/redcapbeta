'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useAuth } from '@/context/AuthContext';

type Activity = {
  id: string;
  activity_id: number;
  activity_name: string;
  activity_type: string;
  start_time: string;
  duration: number;
  distance: number;
  fit_file_path: string;
  user_id: string;
};

type ErrorType = {
  message: string;
};

export default function ActivitySelector() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const supabase = createClientComponentClient();

  // États pour filtrage et pagination
  const [activityTypeFilter, setActivityTypeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const activitiesPerPage = 10;

  // Charger la liste des activités de l'utilisateur
  useEffect(() => {
    const fetchActivities = async () => {
      if (!user) return;

      try {
        setIsLoading(true);
        setError(null);

        const { data, error } = await supabase
          .from('garmin_activities')
          .select('*')
          .eq('user_id', user.id)
          .order('start_time', { ascending: false });

        if (error) {
          throw error;
        }

        console.log(`${data?.length || 0} activités chargées`);
        setActivities(data || []);
      } catch (err: unknown) {
        const typedError = err as ErrorType;
        setError(typedError.message || 'Erreur lors du chargement des activités');
        console.error('Erreur lors du chargement des activités:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivities();
  }, [user, supabase]);

  // Filtrer et organiser les activités
  const filteredActivities = useMemo(() => {
    return activities
      .filter(activity => {
        // Filtre par type d'activité
        if (activityTypeFilter !== 'all' && activity.activity_type !== activityTypeFilter) {
          return false;
        }

        // Filtre par terme de recherche (nom d'activité)
        if (searchTerm && !activity.activity_name.toLowerCase().includes(searchTerm.toLowerCase())) {
          return false;
        }

        return true;
      });
  }, [activities, activityTypeFilter, searchTerm]);

  // Obtenir les types d'activités uniques pour le filtre
  const activityTypes = useMemo(() => {
    const types = activities.map(a => a.activity_type);
    return ['all', ...Array.from(new Set(types))];
  }, [activities]);

  // Pagination
  const indexOfLastActivity = currentPage * activitiesPerPage;
  const indexOfFirstActivity = indexOfLastActivity - activitiesPerPage;
  const currentActivities = filteredActivities.slice(indexOfFirstActivity, indexOfLastActivity);
  const totalPages = Math.ceil(filteredActivities.length / activitiesPerPage);

  // Fonction pour naviguer entre les pages
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  // Fonction pour charger une activité sélectionnée
  const handleLoadActivity = async (activity: Activity) => {
    if (!user) return;

    try {
      setError(null);

      // Télécharger le fichier FIT depuis le bucket storage
      const { data: fileData, error: fileError } = await supabase
        .storage
        .from('database')
        .download(activity.fit_file_path);

      if (fileError) {
        throw fileError;
      }

      console.log('Fichier FIT chargé avec succès:', fileData);

    } catch (err: unknown) {
      const typedError = err as ErrorType;
      setError(typedError.message || 'Erreur lors du chargement du fichier');
      console.error('Erreur lors du chargement du fichier:', err);
    }
  };

  // Formatter la durée en format lisible (HH:MM:SS)
  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    return [
      hrs.toString().padStart(2, '0'),
      mins.toString().padStart(2, '0'),
      secs.toString().padStart(2, '0')
    ].join(':');
  };

  // Formatter la distance (de mètres à kilomètres)
  const formatDistance = (meters: number) => {
    return (meters / 1000).toFixed(2);
  };

  // Formatter la date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Sélectionner une activité depuis la liste
  const handleSelectActivity = (activity: Activity) => {
    setSelectedActivity(activity);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-10">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-600"></div>
        <span className="ml-3 text-gray-700">Chargement des activités...</span>
      </div>
    );
  }

  if (error && !selectedActivity) {
    return (
      <div className="p-4 bg-red-50 border border-red-300 text-red-700 rounded-lg shadow-sm mb-4">
        {error}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-300 text-yellow-700 rounded-lg shadow-sm mb-4">
        Aucune activité trouvée. Veuillez d&apos;abord synchroniser vos données Garmin.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-300 text-red-700 rounded-lg shadow-sm mb-4">
          {error}
        </div>
      )}

      <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Sélection d&apos;activité</h2>

        {/* Filtres */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label htmlFor="activity-type" className="block text-sm font-medium text-gray-700 mb-1">
              Type d&apos;activité
            </label>
            <select
              id="activity-type"
              className="block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={activityTypeFilter}
              onChange={(e) => {
                setActivityTypeFilter(e.target.value);
                setCurrentPage(1); // Réinitialiser la pagination
              }}
            >
              <option value="all">Tous les types</option>
              {activityTypes.filter(type => type !== 'all').map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label htmlFor="search-activity" className="block text-sm font-medium text-gray-700 mb-1">
              Rechercher une activité
            </label>
            <input
              id="search-activity"
              type="text"
              className="block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Rechercher par nom..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1); // Réinitialiser la pagination
              }}
            />
          </div>
        </div>

        {/* Statistiques */}
        <div className="text-xs text-gray-500 mb-4">
          <p>
            Total: {activities.length} activités |
            Filtrées: {filteredActivities.length} activités |
            Page: {currentPage}/{totalPages || 1}
          </p>
        </div>
      </div>

      {/* Liste des activités */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Date
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Nom
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Type
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Distance
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Durée
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentActivities.length > 0 ? (
                currentActivities.map((activity) => (
                  <tr
                    key={activity.id}
                    className={`hover:bg-gray-50 cursor-pointer ${
                      selectedActivity?.id === activity.id ? 'bg-indigo-100' : ''
                    }`}
                    onClick={() => handleSelectActivity(activity)}
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                      {formatDate(activity.start_time)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800 font-medium">
                      {activity.activity_name}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {activity.activity_type}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {formatDistance(activity.distance)} km
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {formatDuration(activity.duration)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center text-sm">
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Empêcher la sélection de l&apos;activité
                          handleSelectActivity(activity);
                          handleLoadActivity(activity);
                        }}
                        className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold px-3 py-1.5 rounded-md text-xs shadow-sm transition-colors"
                      >
                        Analyser
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">
                    Aucune activité ne correspond aux filtres sélectionnés.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center py-3">
          <nav className="inline-flex rounded-md shadow-sm border border-gray-300">
            <button
              onClick={() => paginate(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-l-md bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              &laquo; Préc.
            </button>
            <div className="px-4 py-1.5 border-l border-r border-gray-300 bg-white text-sm text-gray-700">
              {currentPage} / {totalPages}
            </div>
            <button
              onClick={() => paginate(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-r-md bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Suiv. &raquo;
            </button>
          </nav>
        </div>
      )}

      {/* Détails de l&apos;activité sélectionnée */}
      {selectedActivity && (
        <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200 shadow-sm">
          <h3 className="font-semibold text-md text-indigo-800 mb-2">{selectedActivity.activity_name}</h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <div><span className="font-medium text-indigo-700">Type:</span> <span className="text-gray-700">{selectedActivity.activity_type}</span></div>
            <div><span className="font-medium text-indigo-700">Date:</span> <span className="text-gray-700">{formatDate(selectedActivity.start_time)}</span></div>
            <div><span className="font-medium text-indigo-700">Durée:</span> <span className="text-gray-700">{formatDuration(selectedActivity.duration)}</span></div>
            <div><span className="font-medium text-indigo-700">Distance:</span> <span className="text-gray-700">{formatDistance(selectedActivity.distance)} km</span></div>
          </div>
        </div>
      )}
    </div>
  );
}
