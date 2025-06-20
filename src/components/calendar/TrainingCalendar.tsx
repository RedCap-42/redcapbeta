'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTrainingPlanData } from '@/hooks/useTrainingPlanData';

export default function TrainingCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'year' | 'month'>('year');
  const router = useRouter();
  
  // Utiliser le nouveau hook optimisé pour le training plan
  const { 
    monthlyData, 
    loading, 
    error, 
    getActivitiesForDate
  } = useTrainingPlanData(currentDate.getFullYear());  // Fonction pour naviguer vers l'analyse avec une activité spécifique
  const navigateToAnalyse = (activity: typeof monthlyData[0]['dailyActivities'][0]['activities'][0], date: Date) => {
    // Stocker l'activité et la date dans le sessionStorage pour que l'onglet analyse puisse les récupérer
    const activityData = {
      selectedDate: date.toISOString().split('T')[0], // Format YYYY-MM-DD
      activity: {
        id: activity.id,
        activity_id: activity.activity_id,
        start_time: activity.start_time,
        name: activity.activity_name || '',
        distance: activity.distance,
        duration: activity.duration,
        sport_type: activity.activity_type || '',
        elevation_gain: null
      },
      goDirectToDetailedAnalysis: true // Flag pour aller directement en mode analyse détaillée
    };
    
    sessionStorage.setItem('trainingPlanSelectedActivity', JSON.stringify(activityData));
    router.push('/dashboard/analyse');
  };

  // Obtenir le premier jour du mois
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  // Obtenir le dernier jour du mois
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  
  // Obtenir le jour de la semaine du premier jour (0 = dimanche, 1 = lundi, etc.)
  const firstDayWeekday = firstDayOfMonth.getDay();
  // Ajuster pour que lundi soit 0
  const startDayWeekday = firstDayWeekday === 0 ? 6 : firstDayWeekday - 1;

  // Noms des jours de la semaine
  const daysOfWeek = ['LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI', 'DIMANCHE'];
  // Noms des mois abrégés pour la vue annuelle
  const shortMonthNames = [
    'JANV.', 'FÉVR.', 'MARS', 'AVR.',
    'MAI', 'JUIN', 'JUIL.', 'AOÛT',
    'SEPT.', 'OCT.', 'NOV.', 'DÉC.'
  ];
  // Noms des mois complets
  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];
  // Fonction pour formater la durée en heures et minutes
  const formatDuration = (durationInSeconds: number) => {
    const hours = Math.floor(durationInSeconds / 3600);
    const minutes = Math.floor((durationInSeconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`;
    }
    return `${minutes}m`;
  };

  // Fonction pour obtenir la couleur selon le type d'activité
  const getActivityColor = (activityType: string) => {
    const type = activityType?.toLowerCase() || '';
    
    if (type.includes('running') || type.includes('course')) return 'bg-red-500';
    if (type.includes('cycling') || type.includes('vélo')) return 'bg-blue-500';
    if (type.includes('swimming') || type.includes('natation')) return 'bg-cyan-500';
    if (type.includes('hiking') || type.includes('randonnée')) return 'bg-green-500';
    if (type.includes('walking') || type.includes('marche')) return 'bg-gray-500';
    
    return 'bg-purple-500'; // couleur par défaut
  };  // Fonction pour générer les barres d'entraînement optimisée
  const generateTrainingBars = (monthData: typeof monthlyData[0]) => {
    if (!monthData || monthData.dailyActivities.length === 0) {
      // Afficher des barres vides si pas d'activités
      const daysInMonth = new Date(currentDate.getFullYear(), monthData.month + 1, 0).getDate();
      return Array(Math.min(daysInMonth, 31)).fill(0).map((_, index) => (
        <div
          key={index}
          className="bg-gray-200/50 rounded-sm"
          style={{
            height: '3px',
            width: '3px',
            marginRight: '1px'
          }}
        />
      ));
    }
    
    // Créer un tableau pour tous les jours du mois (index 0 = jour 1)
    const daysInMonth = new Date(currentDate.getFullYear(), monthData.month + 1, 0).getDate();
    const dailyHours = Array(daysInMonth).fill(0);
    
    // Remplir avec les vraies données d'activités
    monthData.dailyActivities.forEach(dayActivity => {
      const activityDate = new Date(dayActivity.date);
      const dayIndex = activityDate.getDate() - 1; // Convertir en index (0-based)
      if (dayIndex >= 0 && dayIndex < daysInMonth) {
        dailyHours[dayIndex] = dayActivity.totalDuration / 3600; // convertir en heures
      }
    });
    
    // Calculer la hauteur maximale pour le scaling (minimum 0.5 pour éviter division par 0)
    const maxHeight = Math.max(...dailyHours, 0.5);
    
    return dailyHours.map((hours, index) => {
      const heightPercent = maxHeight > 0 ? (hours / maxHeight) * 100 : 0;
      // Limiter la hauteur maximum à 36px pour laisser de l'espace en haut
      const barHeight = Math.max(2, (heightPercent / 100) * 36); 
      
      return (
        <div
          key={index}
          className={`rounded transition-all duration-300 ${
            hours > 0 
              ? 'bg-gradient-to-t from-blue-500 to-blue-400 hover:from-blue-600 hover:to-blue-500 shadow-sm' 
              : 'bg-gray-200/40'
          }`}
          style={{
            height: `${barHeight}px`,
            width: '4px',
            marginRight: '1px'
          }}
          title={hours > 0 ? `Jour ${index + 1}: ${hours.toFixed(1)}h` : `Jour ${index + 1}: Repos`}
        />
      );
    });
  };

  // Affichage du loading
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Chargement des activités...</p>
      </div>
    );
  }

  // Affichage des erreurs
  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <div className="text-red-600 mb-4">
          <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 18.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Erreur de chargement</h3>
        <p className="text-gray-600 mb-4">{error}</p>
      </div>
    );
  }  // Vue annuelle améliorée
  const YearView = () => {
    return (
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg border border-gray-100 p-8 mb-6">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-3">
            Aperçu annuel {currentDate.getFullYear()}
          </h2>
          <p className="text-gray-500 text-lg">Volume d&apos;entraînement par mois</p>
        </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {monthlyData.map((monthData, index) => (
            <div 
              key={index}
              className="bg-white border border-gray-100 rounded-xl p-6 cursor-pointer hover:shadow-lg hover:border-blue-200 hover:-translate-y-1 transition-all duration-300 group"
              onClick={() => {
                setCurrentDate(new Date(currentDate.getFullYear(), monthData.month, 1));
                setViewMode('month');
              }}
            >
              <div className="text-center">
                <div className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">
                  {shortMonthNames[monthData.month]}
                </div>
                
                <div className="text-4xl font-bold text-gray-800 mb-2 group-hover:text-blue-600 transition-colors duration-300">
                  {monthData.totalHours}
                </div>
                <div className="text-xs text-blue-500 font-semibold mb-1 uppercase tracking-wide">
                  HEURES
                </div>
                
                {/* Informations supplémentaires */}
                <div className="text-xs text-gray-400 mb-6 space-y-0.5">
                  <div>{monthData.totalActivities} activité{monthData.totalActivities !== 1 ? 's' : ''}</div>
                  {monthData.dailyActivities.length > 0 && (
                    <div>{monthData.dailyActivities.length} jour{monthData.dailyActivities.length !== 1 ? 's' : ''} actif{monthData.dailyActivities.length !== 1 ? 's' : ''}</div>
                  )}
                </div>
                
                {/* Graphique en barres amélioré */}
                <div className="flex justify-center items-end h-12 space-x-px bg-gradient-to-b from-gray-50 to-gray-100 rounded-lg p-3 border border-gray-100">
                  {generateTrainingBars(monthData)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Générer les jours du calendrier
  const generateCalendarDays = () => {
    const days = [];
    const totalDays = lastDayOfMonth.getDate();
    
    // Ajouter les jours vides au début
    for (let i = 0; i < startDayWeekday; i++) {
      days.push(null);
    }
    
    // Ajouter tous les jours du mois
    for (let day = 1; day <= totalDays; day++) {
      days.push(day);
    }
    
    return days;
  };
  const calendarDays = generateCalendarDays();return (
    <div>
      {viewMode === 'year' ? (
        <YearView />
      ) : (        <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg border border-gray-100 p-6">          {/* Header avec retour vers vue annuelle */}
          <div className="flex items-center justify-between mb-6">            <button
              onClick={() => setViewMode('year')}
              className="flex items-center space-x-2 px-3 py-2 hover:bg-blue-50 rounded-lg transition-all duration-200 text-gray-500 hover:text-blue-600 group"
            >
              <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm font-medium">Retour à la vue annuelle</span>
            </button>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            
            <div className="w-32"></div> {/* Spacer pour centrer le titre */}
          </div>

          {/* Header des jours de la semaine */}
          <div className="grid grid-cols-7 gap-2 mb-4">
            {daysOfWeek.map((day) => (
              <div
                key={day}
                className="py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wide"
              >
                {day}
              </div>
            ))}
          </div>{/* Grille du calendrier */}
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((day, index) => {
              const isToday = day === new Date().getDate() && 
                             currentDate.getMonth() === new Date().getMonth() && 
                             currentDate.getFullYear() === new Date().getFullYear();
              
              // Récupérer les activités pour ce jour
              const dayActivities = day ? getActivitiesForDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day)) : null;
              
              return (                <div
                  key={index}
                  className={`
                    min-h-[120px] p-3 rounded-xl border transition-all duration-300
                    ${day ? 'hover:bg-blue-50/50 cursor-pointer border-gray-100 hover:border-blue-200 hover:shadow-sm' : 'border-transparent'}
                    ${isToday ? 'bg-blue-50/70 border-blue-300 ring-2 ring-blue-200/50 shadow-sm' : 'bg-white/80 hover:border-gray-200'}
                  `}
                >
                  {day && (
                    <>
                      <div className={`text-right text-sm mb-3 ${
                        isToday 
                          ? 'font-semibold text-blue-700' 
                          : 'font-medium text-gray-700'
                      }`}>
                        {day}
                      </div>                      {/* Affichage des activités amélioré */}
                      <div className="space-y-1">
                        {dayActivities?.activities.slice(0, 2).map((activity, actIndex) => (                          <div
                            key={actIndex}
                            className="flex flex-col space-y-0.5 text-xs bg-white/90 rounded-lg px-2 py-1.5 border border-gray-200/60 cursor-pointer hover:bg-blue-50 hover:border-blue-300 hover:shadow-sm transition-all duration-200 backdrop-blur-sm"
                            title={`Cliquer pour analyser: ${activity.activity_name || 'Activité'} - ${formatDuration(activity.duration || 0)}`}
                            onClick={(e) => {
                              e.stopPropagation(); // Empêcher la propagation vers le parent
                              navigateToAnalyse(activity, new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
                            }}
                          >
                            <div className="flex items-center space-x-1">
                              <div 
                                className={`w-2 h-2 rounded-full flex-shrink-0 ${getActivityColor(activity.activity_type || '')}`}
                              />
                              <span className="text-gray-700 truncate flex-1 font-medium">
                                {activity.activity_name || activity.activity_type || 'Activité'}
                              </span>
                              <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                            {/* Affichage de l'heure */}
                            <div className="text-xs text-gray-500 ml-3">
                              {new Date(activity.start_time).toLocaleTimeString('fr-FR', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </div>
                          </div>
                        ))}
                        
                        {/* Afficher "+" si plus de 2 activités */}
                        {dayActivities && dayActivities.activities.length > 2 && (                          <div 
                            className="text-xs text-gray-500 text-center bg-gray-50/80 border border-gray-200/60 rounded-lg py-1.5 cursor-pointer hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition-all duration-200 backdrop-blur-sm"
                            title="Cliquer pour voir la première activité de ce jour"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigateToAnalyse(dayActivities.activities[0], new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
                            }}
                          >
                            +{dayActivities.activities.length - 2} autre{dayActivities.activities.length - 2 > 1 ? 's' : ''}
                          </div>
                        )}                        
                        {/* Afficher le temps total si il y a des activités */}
                        {dayActivities && dayActivities.totalDuration > 0 && (                          <div 
                            className="text-xs font-bold text-blue-600 text-center mt-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/60 rounded-lg py-1.5 cursor-pointer hover:from-blue-100 hover:to-indigo-100 hover:border-blue-300 transition-all duration-200 backdrop-blur-sm shadow-sm"
                            title="Cliquer pour analyser les activités de ce jour"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigateToAnalyse(dayActivities.activities[0], new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
                            }}
                          >
                            {formatDuration(dayActivities.totalDuration)}
                            <svg className="w-3 h-3 inline-block ml-1 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
