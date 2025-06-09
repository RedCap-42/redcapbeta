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

    // Générer les options pour chaque mois, du plus ancien au plus récent
    for (let i = 0; i <= monthsFromOldest; i++) {
      // Commencer par le mois le plus ancien et avancer jusqu'au mois actuel
      const date = new Date(
        oldestActivityDate.getFullYear(),
        oldestActivityDate.getMonth() + i,
        1
      );

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
        <div className="flex justify-center items-center py-8 h-80 w-80 bg-white rounded-lg shadow-md border border-gray-200">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
          <span className="ml-3 text-gray-600">Chargement...</span>
        </div>
    );
  }

  if (error && !selectedActivity) {
    return (
        <div className="p-4 bg-red-50 border border-red-300 text-red-700 rounded-lg shadow-sm mb-4 h-80 w-80 flex flex-col justify-center items-center">
          <svg className="w-12 h-12 text-red-400 mb-3" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <p className="font-medium mb-1">Erreur de chargement</p>
          <p className="text-xs text-center">{error}</p>
        </div>
    );
  }

  if (activities.length === 0) {
    return (
        <div className="p-4 bg-yellow-50 border border-yellow-300 text-yellow-700 rounded-lg shadow-sm mb-4 h-80 w-80 flex flex-col justify-center items-center">
            <svg className="w-12 h-12 text-yellow-400 mb-3" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor"><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <p className="font-medium mb-1">Aucune activité</p>
            <p className="text-xs text-center">Veuillez synchroniser vos données Garmin.</p>
        </div>
    );
  }

  return (
      <>
        {error && (
            <div className="p-2 bg-red-50 border border-red-300 text-red-700 rounded-lg mb-2 text-xs shadow-sm">
              {error}
            </div>
        )}

        <div className="grid grid-cols-1 gap-6">
          {/* Calendrier compact */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-md overflow-hidden w-80 h-auto">
            <div className="p-3 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h3 className="font-semibold text-gray-700 text-sm">Calendrier des activités</h3>
              <div className="flex items-center space-x-1">
                <button
                    onClick={() => {
                      const newDate = new Date(currentDate);
                      newDate.setMonth(currentDate.getMonth() - 1);
                      setCurrentDate(newDate);
                    }}
                    className="p-1 rounded-md hover:bg-gray-200 text-gray-600 transition-colors"
                    title="Mois précédent"
                >
                  <svg className="w-4 h-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor"><path d="M15 19l-7-7 7-7"></path></svg>
                </button>

                <div className="relative">
                  <select
                      value={`${currentDate.getFullYear()}-${currentDate.getMonth()}`}
                      onChange={handleMonthChange}
                      className="px-2 py-1 border border-gray-300 rounded-md bg-white text-xs font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 appearance-none w-full text-center shadow-sm"
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
                    className="p-1 rounded-md hover:bg-gray-200 text-gray-600 transition-colors"
                    title="Mois suivant"
                >
                  <svg className="w-4 h-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor"><path d="M9 5l7 7-7 7"></path></svg>
                </button>

                <button
                    onClick={goToCurrentMonth}
                    className="ml-1 text-xs bg-indigo-500 hover:bg-indigo-600 text-white font-semibold px-2 py-1 rounded-md shadow-sm transition-colors"
                >
                  Auj.
                </button>
              </div>
            </div>

            <div className="p-3">
              {/* Jours de la semaine */}
              <div className="grid grid-cols-7 gap-1 mb-2 text-center">
                {['L', 'Ma', 'Me', 'J', 'V', 'S', 'D'].map((day, index) => (
                    <div key={index} className="text-xs font-medium text-gray-500">
                      {day}
                    </div>
                ))}
              </div>

              {/* Grille du calendrier plus large */}
              <div className="grid grid-cols-7 gap-1">
                {calendarGrid.map((day, index) => {
                  const isSelectedActivity = isSelectedActivityDate(day.date);
                  const isSelected = selectedDate &&
                                     selectedDate.getDate() === day.date.getDate() &&
                                     selectedDate.getMonth() === day.date.getMonth() &&
                                     selectedDate.getFullYear() === day.date.getFullYear();

                  return (
                      <div
                          key={index}
                          onClick={(e) => handleDateClick(day, e)}
                          className={`
                      relative w-9 h-9 flex items-center justify-center text-xs rounded-lg transition-all duration-150 ease-in-out
                      ${day.isCurrentMonth ? 'text-gray-700' : 'text-gray-400 bg-gray-50'}
                      ${day.isToday ? 'font-bold text-indigo-600 bg-indigo-50' : ''}
                      ${day.activities.length > 0 ? 'cursor-pointer hover:bg-indigo-100' : 'cursor-default'}
                      ${isSelectedActivity
                              ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 font-semibold shadow-lg'
                              : day.activities.length > 0 && day.isCurrentMonth
                                  ? 'bg-indigo-50 ring-1 ring-indigo-300'
                                  : day.activities.length > 0 ? 'bg-gray-100 ring-1 ring-gray-300' : ''
                          }
                      ${isSelected && !isSelectedActivity
                              ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-300 font-semibold'
                              : ''}
                    `}
                      >
                        <span>{day.date.getDate()}</span>

                        {day.activities.length > 0 && !isSelectedActivity && (
                            <span
                                className={`absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 rounded-full ${day.isCurrentMonth ? 'bg-blue-500' : 'bg-gray-400'}`}
                                title={`${day.activities.length} activité(s)`}
                            />
                        )}

                        {day.activities.length > 0 && isSelectedActivity && (
                            <span
                                className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-white rounded-full"
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
                className="fixed bg-white shadow-xl rounded-lg border border-gray-300 z-50 p-2"
                style={{ top: `${popupPosition.y + 5}px`, left: `${popupPosition.x}px`, minWidth: '200px', maxWidth: '280px' }}
            >
              <div className="flex justify-between items-center pb-2 mb-2 border-b border-gray-200">
                <h3 className="font-semibold text-sm text-gray-800">
                  Activités du {selectedDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                </h3>
                <button
                    onClick={() => setShowPopup(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full"
                    title="Fermer"
                >
                  <svg className="w-4 h-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              </div>
              <ul className="max-h-48 overflow-y-auto space-y-1">
                {selectedDate && getActivitiesForDate(selectedDate, activities).map(activity => (
                    <li
                        key={activity.id}
                        onClick={() => handleSelectActivity(activity)}
                        className="p-2 hover:bg-indigo-50 rounded-md cursor-pointer transition-colors"
                    >
                      <div className="font-medium text-sm text-gray-800 truncate">{activity.activity_name}</div>
                      <div className="text-xs text-gray-500">
                        {formatTime(activity.start_time)} - <span className="font-medium">{activity.activity_type}</span>
                      </div>
                    </li>
                ))}
                {getActivitiesForDate(selectedDate, activities).length === 0 && (
                    <li className="p-2 text-sm text-gray-500 text-center">Aucune activité ce jour.</li>
                )}
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