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

type ActivityCalendarProps = {
  onDateSelect?: (dateString: string) => void;
  onActivitySelect?: (activity: Activity) => void;
};

export default function ActivityCalendar({ onDateSelect, onActivitySelect }: ActivityCalendarProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
          setError(error.message || 'Erreur lors du chargement des activités');
          console.error('Erreur lors du chargement des activités:', error);
          return;
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

  // Fonction pour vérifier si une date correspond à l'activité sélectionnée
  const isSelectedActivityDate = (date: Date) => {
    if (!selectedActivity) return false;

    const activityDate = new Date(selectedActivity.start_time);
    return (
        date.getDate() === activityDate.getDate() &&
        date.getMonth() === activityDate.getMonth() &&
        date.getFullYear() === activityDate.getFullYear()
    );
  };

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

    // Gestion de la sélection d'une date
    setSelectedDate(day.date);

    // Notification au parent de la sélection avec le format YYYY-MM-DD
    if (onDateSelect) {
      const year = day.date.getFullYear();
      const month = String(day.date.getMonth() + 1).padStart(2, '0'); // +1 car les mois commencent à 0
      const date = String(day.date.getDate()).padStart(2, '0');
      onDateSelect(`${year}-${month}-${date}`);
    }
  };

  // Sélectionner une activité depuis la liste
  const handleSelectActivity = (activity: Activity) => {
    setSelectedActivity(activity);
    setShowPopup(false);

    // Notification au parent de la sélection d'une activité
    if (onActivitySelect) {
      onActivitySelect(activity);
    }
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

        <div className="grid grid-cols-1 gap-6">
          {/* Calendrier compact */}
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
                {calendarGrid.map((day, index) => {
                  const isSelectedActivity = isSelectedActivityDate(day.date);

                  return (
                      <div
                          key={index}
                          onClick={(e) => handleDateClick(day, e)}
                          className={`
                      relative w-9 h-9 flex items-center justify-center text-xs rounded transition-all duration-200
                      ${day.isCurrentMonth ? 'bg-white' : 'bg-gray-50 text-gray-400'}
                      ${day.isToday ? 'font-bold text-indigo-700' : ''}
                      ${day.activities.length > 0 ? 'cursor-pointer hover:bg-indigo-50' : ''}
                      ${isSelectedActivity
                              ? '!bg-blue-600 !text-white !ring-2 !ring-blue-600 !font-bold shadow-md'
                              : day.activities.length > 0
                                  ? 'ring-1 ring-indigo-300'
                                  : ''
                          }
                      ${selectedDate &&
                          selectedDate.getDate() === day.date.getDate() &&
                          selectedDate.getMonth() === day.date.getMonth() &&
                          selectedDate.getFullYear() === day.date.getFullYear() &&
                          !isSelectedActivity
                              ? '!bg-indigo-100 !text-indigo-800 !ring-2 !ring-indigo-300 !font-bold'
                              : ''}
                    `}
                      >
                        <span>{day.date.getDate()}</span>

                        {day.activities.length > 0 && !isSelectedActivity && (
                            <span
                                className="absolute bottom-0.5 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-500 rounded-full"
                                title={`${day.activities.length} activité(s)`}
                            />
                        )}

                        {day.activities.length > 0 && isSelectedActivity && (
                            <span
                                className="absolute bottom-0.5 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-white rounded-full"
                                title={`${day.activities.length} activité(s) - Activité sélectionnée`}
                            />
                        )}
                      </div>
                  );
                })}
              </div>
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