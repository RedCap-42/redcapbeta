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

type CalendarDay = {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  activities: Activity[];
};

type ErrorType = {
  message: string;
};

export default function ActivityCalendar() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const { user } = useAuth();
  const supabase = createClientComponentClient();

  // État pour le calendrier
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });

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

  // Créer la grille du calendrier
  const calendarGrid = useMemo(() => {
    // Obtenir le premier jour du mois
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    // Jour de la semaine du premier jour du mois (0 = dimanche, 1 = lundi, etc.)
    let firstDayOfWeek = firstDayOfMonth.getDay();
    if (firstDayOfWeek === 0) firstDayOfWeek = 7; // Transformer dimanche en 7 pour un calendrier européen

    // Nombre de jours dans le mois
    const daysInMonth = lastDayOfMonth.getDate();

    // Jours du mois précédent pour remplir la première semaine
    const prevMonthDays = firstDayOfWeek - 1;

    // Créer la grille du calendrier
    const grid: CalendarDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Ajouter les jours du mois précédent
    const prevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1);
    const daysInPrevMonth = new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0).getDate();

    for (let i = prevMonthDays - 1; i >= 0; i--) {
      const date = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), daysInPrevMonth - i);
      grid.push({
        date,
        isCurrentMonth: false,
        isToday: date.getTime() === today.getTime(),
        activities: getActivitiesForDate(date, activities)
      });
    }

    // Ajouter les jours du mois en cours
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), i);
      grid.push({
        date,
        isCurrentMonth: true,
        isToday: date.getTime() === today.getTime(),
        activities: getActivitiesForDate(date, activities)
      });
    }

    // Calcul du nombre de jours pour compléter la dernière semaine
    const remainingDays = 7 - (grid.length % 7);
    if (remainingDays < 7) {
      // Ajouter les jours du mois suivant
      for (let i = 1; i <= remainingDays; i++) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, i);
        grid.push({
          date,
          isCurrentMonth: false,
          isToday: date.getTime() === today.getTime(),
          activities: getActivitiesForDate(date, activities)
        });
      }
    }

    return grid;
  }, [currentDate, activities]);

  // Grouper les activités par date
  function getActivitiesForDate(date: Date, allActivities: Activity[]): Activity[] {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return allActivities.filter(activity => {
      const activityDate = new Date(activity.start_time);
      return activityDate >= startOfDay && activityDate <= endOfDay;
    });
  }

  // Fonctions pour générer les options du menu déroulant
  const getMonthOptions = () => {
    const options = [];
    const today = new Date();

    // Trouver la date de la première activité
    let oldestActivityDate = today;
    if (activities.length > 0) {
      // Trier les activités par date (anciennes en premier)
      const sortedActivities = [...activities].sort((a, b) =>
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      );
      // Récupérer la date de la première activité
      oldestActivityDate = new Date(sortedActivities[0].start_time);
    }

    // Calculer le nombre de mois depuis la première activité jusqu'à aujourd'hui
    const monthsFromOldest =
      (today.getFullYear() - oldestActivityDate.getFullYear()) * 12 +
      (today.getMonth() - oldestActivityDate.getMonth());

    // Ajouter d'abord le mois actuel et les 3 mois futurs
    for (let i = 0; i <= 3; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const monthName = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      const value = `${date.getFullYear()}-${date.getMonth()}`;

      options.push({ value, label: monthName });
    }

    // Ensuite ajouter les mois passés depuis la première activité
    for (let i = 1; i <= monthsFromOldest; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      const value = `${date.getFullYear()}-${date.getMonth()}`;

      options.push({ value, label: monthName });
    }

    return options;
  };

  // Gérer le changement de mois via le menu déroulant
  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const [year, month] = e.target.value.split('-').map(Number);
    setCurrentDate(new Date(year, month, 1));
  };

  // Aller au mois actuel
  const goToCurrentMonth = () => {
    setCurrentDate(new Date());
  };

  // Traiter le clic sur une date
  const handleDateClick = (day: CalendarDay, e: React.MouseEvent) => {
    if (day.activities.length === 0) return;

    setSelectedDate(day.date);

    // Si une seule activité, la sélectionner directement
    if (day.activities.length === 1) {
      handleSelectActivity(day.activities[0]);
      return;
    }

    // Sinon, montrer une popup pour choisir parmi les activités
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setPopupPosition({
      x: rect.left,
      y: rect.bottom + window.scrollY
    });
    setShowPopup(true);
  };

  // Fonction pour charger une activité sélectionnée
  const handleLoadActivity = async (activity: Activity) => {
    if (!user) return;

    try {
      setLoadingActivity(true);
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
    } finally {
      setLoadingActivity(false);
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

  // Sélectionner une activité depuis la liste
  const handleSelectActivity = (activity: Activity) => {
    setSelectedActivity(activity);
    setShowPopup(false);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
        <span className="ml-2">Chargement des activités...</span>
      </div>
    );
  }

  if (error && !selectedActivity) {
    return (
      <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded mb-4">
        {error}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded mb-4">
        Aucune activité trouvée. Veuillez d&apos;abord synchroniser vos données Garmin.
      </div>
    );
  }

  return (
    <>
      {error && (
        <div className="p-2 bg-red-100 border border-red-400 text-red-700 rounded mb-2 text-xs">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Premier widget: Calendrier compact */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden w-80 h-auto">
          <div className="p-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h3 className="font-semibold text-gray-700 text-sm">Calendrier des activités</h3>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => {
                  const newDate = new Date(currentDate);
                  newDate.setMonth(currentDate.getMonth() - 1);
                  setCurrentDate(newDate);
                }}
                className="p-0.5 rounded hover:bg-gray-100 text-gray-600"
                title="Mois précédent"
              >
                &larr;
              </button>

              <div className="relative">
                <select
                  value={`${currentDate.getFullYear()}-${currentDate.getMonth()}`}
                  onChange={handleMonthChange}
                  className="px-1 py-0.5 border border-gray-200 rounded bg-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 appearance-none w-full text-center"
                >
                  {getMonthOptions().map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => {
                  const newDate = new Date(currentDate);
                  newDate.setMonth(currentDate.getMonth() + 1);
                  setCurrentDate(newDate);
                }}
                className="p-0.5 rounded hover:bg-gray-100 text-gray-600"
                title="Mois suivant"
              >
                &rarr;
              </button>

              <button
                onClick={goToCurrentMonth}
                className="ml-1 text-[10px] bg-indigo-100 text-indigo-700 px-1 py-0.5 rounded hover:bg-indigo-200"
              >
                Auj.
              </button>
            </div>
          </div>

          <div className="p-2 aspect-square">
            {/* Jours de la semaine */}
            <div className="grid grid-cols-7 gap-0 mb-1 text-center">
              {['L', 'Ma', 'Me', 'J', 'V', 'S', 'D'].map((day, index) => (
                <div key={index} className="text-[10px] font-medium text-gray-500">
                  {day}
                </div>
              ))}
            </div>

            {/* Grille du calendrier plus large */}
            <div className="grid grid-cols-7 gap-0 aspect-square">
              {calendarGrid.map((day, index) => (
                <div
                  key={index}
                  onClick={(e) => handleDateClick(day, e)}
                  className={`
                    relative w-9 h-9 flex items-center justify-center text-xs rounded
                    ${day.isCurrentMonth ? 'bg-white' : 'bg-gray-50 text-gray-400'}
                    ${day.isToday ? 'font-bold text-indigo-700' : ''}
                    ${day.activities.length > 0 
                      ? 'cursor-pointer hover:bg-indigo-50 ring-1 ring-indigo-500' 
                      : ''}
                  `}
                >
                  <span>{day.date.getDate()}</span>

                  {day.activities.length > 0 && (
                    <span
                      className="absolute bottom-0.5 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-500 rounded-full"
                      title={`${day.activities.length} activité(s)`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Deuxième widget: Informations de l'activité sélectionnée */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden w-72">
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <h3 className="font-semibold text-gray-700">{selectedActivity ? "Détails de l'activité" : "Activité"}</h3>
          </div>

          <div className="p-4">
            {selectedActivity ? (
              <div className="flex flex-col space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-base truncate">{selectedActivity.activity_name}</h4>
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    {selectedActivity.activity_type}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Date</p>
                    <p className="text-sm font-medium">{new Date(selectedActivity.start_time).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Heure</p>
                    <p className="text-sm font-medium">{formatTime(selectedActivity.start_time)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Durée</p>
                    <p className="text-sm font-medium">{formatDuration(selectedActivity.duration)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Distance</p>
                    <p className="text-sm font-medium">{formatDistance(selectedActivity.distance)} km</p>
                  </div>
                </div>

                <button
                  onClick={() => handleLoadActivity(selectedActivity)}
                  disabled={loadingActivity}
                  className="w-full mt-4 px-3 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 disabled:opacity-50"
                >
                  {loadingActivity ? (
                    <>
                      <span className="inline-block animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2 align-[-2px]"></span>
                      Chargement...
                    </>
                  ) : (
                    'Analyser cette activité'
                  )}
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-gray-500 text-sm">Sélectionnez une date avec une activité<br/>pour afficher les détails</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Popup pour sélection d'activités */}
      {showPopup && selectedDate && (
        <div
          className="fixed bg-white shadow-lg rounded-md border border-gray-200 z-50 p-1"
          style={{ top: `${popupPosition.y}px`, left: `${popupPosition.x}px`, maxWidth: '250px' }}
        >
          <div className="p-2 border-b">
            <h3 className="font-medium text-xs">
              Activités du {selectedDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
            </h3>
            <button
              onClick={() => setShowPopup(false)}
              className="absolute top-1 right-1 text-gray-500 hover:text-gray-700 text-xs"
            >
              ✕
            </button>
          </div>
          <ul className="max-h-48 overflow-y-auto">
            {selectedDate && getActivitiesForDate(selectedDate, activities).map(activity => (
              <li
                key={activity.id}
                onClick={() => handleSelectActivity(activity)}
                className="p-2 hover:bg-gray-100 cursor-pointer text-xs"
              >
                <div className="font-medium truncate">{activity.activity_name}</div>
                <div className="text-[10px] text-gray-500">
                  {formatTime(activity.start_time)} - {activity.activity_type}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

// Fonction d'aide pour formater l'heure seulement
function formatTime(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  });
}
