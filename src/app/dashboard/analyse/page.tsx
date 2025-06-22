"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import ActivityCalendar from "@/components/activity/ActivityCalendar";
import ActivityDetail from "@/components/activity/ActivityDetail";
import ActivityAnalysisMain from "@/components/activityAnalysis/ActivityAnalysisMain";

// Type pour les activités
type Activity = {
  id: string;
  activity_id: number;
  start_time: string;
  name: string;
  distance: number;
  duration: number;
  sport_type: string;
  elevation_gain?: number | null;
};

// Interface pour les activités provenant du composant ActivityCalendar
interface CalendarActivity {
  id: string;
  activity_id: number;
  activity_name: string;
  activity_type: string;
  start_time: string;
  duration: number;
  distance: number;
  fit_file_path: string;
  user_id: string;
}

// Interface pour la dernière activité
interface LastActivity {
  id: string;
  activity_id: number;
  activity_name: string;
  activity_type: string;
  start_time: string;
  duration: number;
  distance: number;
  fit_file_path: string;
}

export default function AnalysePage() {
  // États
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [isDetailedAnalysisMode, setIsDetailedAnalysisMode] = useState(false);
  const [lastActivity, setLastActivity] = useState<LastActivity | null>(null);

  // Log component render and state
  console.log(
    `AnalysePage RENDER - isLoading: ${isLoading}, selectedDate: ${selectedDate}, selectedActivity: ${selectedActivity ? selectedActivity.id : 'null'}, isDetailedAnalysisMode: ${isDetailedAnalysisMode}`
  );

  // Auth et base de données
  const { user } = useAuth();
  const supabase = createClientComponentClient();
  // Fonction pour récupérer la dernière activité
  const fetchLastActivity = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('garmin_activities')
        .select('*')
        .eq('user_id', user.id)
        .order('start_time', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Erreur lors de la récupération de la dernière activité:', error);
        return;
      }

      if (data) {
        setLastActivity(data);
      }
    } catch (err) {
      console.error('Erreur lors de la récupération de la dernière activité:', err);
    }
  }, [user, supabase]);

  // Effet pour vérifier l'authentification et récupérer une activité depuis le training plan ou les stats
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }    // Vérifier s'il y a une activité sélectionnée depuis le training plan
    const trainingPlanData = sessionStorage.getItem('trainingPlanSelectedActivity');
    if (trainingPlanData) {
      try {
        const { selectedDate: planDate, activity, goDirectToDetailedAnalysis } = JSON.parse(trainingPlanData);
        console.log('Loading activity from training plan:', activity);
        
        setSelectedDate(planDate);
        setSelectedActivity(activity);
        
        // Si le flag est présent, aller directement en mode analyse détaillée
        if (goDirectToDetailedAnalysis) {
          setIsDetailedAnalysisMode(true);
        }
        
        // Nettoyer le sessionStorage après utilisation
        sessionStorage.removeItem('trainingPlanSelectedActivity');
      } catch (error) {
        console.error('Error parsing training plan data:', error);
        sessionStorage.removeItem('trainingPlanSelectedActivity');
      }
    }
    
    // Charger la dernière activité
    fetchLastActivity();
      setIsLoading(false);
  }, [user, fetchLastActivity]);

  // Effets pour charger l'activité lorsque la date change
  useEffect(() => {
    const fetchActivityForDate = async () => {
      if (!selectedDate || !user) return;

      try {
        setIsLoading(true);

        // Format de la date pour la requête : YYYY-MM-DD
        const dateStart = new Date(selectedDate);
        dateStart.setHours(0, 0, 0, 0);

        const dateEnd = new Date(selectedDate);
        dateEnd.setHours(23, 59, 59, 999);

        const { data, error } = await supabase
          .from("garmin_activities")
          .select("*")
          .eq("user_id", user.id)
          .gte("start_time", dateStart.toISOString())
          .lte("start_time", dateEnd.toISOString())
          .order("start_time", { ascending: false });

        if (error) throw error;

        if (data && data.length > 0) {
          setSelectedActivity(data[0] as Activity);
        } else {
          setSelectedActivity(null);
        }
      } catch (error) {
        console.error("Erreur lors du chargement de l'activité:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivityForDate();
  }, [selectedDate, user, supabase]);

  // Fonction pour gérer le clic sur une date dans le calendrier
  function handleDateSelect(date: string) {
    console.log(`AnalysePage: handleDateSelect CALLED with date: ${date}`);
    setSelectedDate(date);
    // Retour à la vue principale si on change de date
    setIsDetailedAnalysisMode(false);
  }

  // Fonction pour passer en mode analyse détaillée
  function handleAnalyzeActivity() {
    console.log("AnalysePage: handleAnalyzeActivity CALLED.");
    console.log("AnalysePage: current selectedActivity:", selectedActivity ? selectedActivity.id : 'null');
    if (selectedActivity) {
      console.log("AnalysePage: Setting isDetailedAnalysisMode to true.");
      setIsDetailedAnalysisMode(true);
    } else {
      console.warn("AnalysePage: No selectedActivity. Cannot switch to detailed analysis mode.");
    }  }

  // Fonction pour gérer la sélection directe d'une activité
  function handleActivitySelect(activity: CalendarActivity) {
    console.log(`AnalysePage: handleActivitySelect CALLED with activity: ${activity.id}`);
    // Adapter le format de l'activité reçue du calendrier au format utilisé dans cette page
    const adaptedActivity: Activity = {
      id: activity.id,
      activity_id: activity.activity_id,
      start_time: activity.start_time,
      name: activity.activity_name || '',  // Map activity_name à name
      distance: activity.distance,
      duration: activity.duration,
      sport_type: activity.activity_type || '',  // Map activity_type à sport_type
      elevation_gain: null
    };
    setSelectedActivity(adaptedActivity);
  }

  // Fonction pour formater la durée
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h${minutes.toString().padStart(2, '0')}`;
    }
    return `${minutes}min`;
  };

  // Fonction pour formater la distance
  const formatDistance = (meters: number): string => {
    return `${(meters / 1000).toFixed(2)} km`;
  };

  // Fonction pour formater la date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };  // Fonction pour analyser directement la dernière activité
  const handleAnalyzeLastActivity = () => {
    if (lastActivity) {
      // Adapter le format de l'activité
      const adaptedActivity: Activity = {
        id: lastActivity.id,
        activity_id: lastActivity.activity_id,
        start_time: lastActivity.start_time,
        name: lastActivity.activity_name || '',
        distance: lastActivity.distance,
        duration: lastActivity.duration,
        sport_type: lastActivity.activity_type || '',
        elevation_gain: null
      };
      setSelectedActivity(adaptedActivity);
      setIsDetailedAnalysisMode(true);
    }
  };

  // Affichage pendant le chargement
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-64px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }  // Interface d'analyse détaillée (Phase 2)
  if (isDetailedAnalysisMode && selectedActivity) {
    console.log("AnalysePage: RENDERING Phase 2 (ActivityAnalysisMain) for activity:", selectedActivity.id);
    
    // Adapter l'activité pour le composant
    const adaptedActivity = {
      activity_name: selectedActivity.name,
      start_time: selectedActivity.start_time,
      distance: selectedActivity.distance,
      duration: selectedActivity.duration,
      elevation_gain: selectedActivity.elevation_gain || undefined,
      id: selectedActivity.id,
      activity_id: selectedActivity.activity_id,
      sport_type: selectedActivity.sport_type
    };
    
    return (
      <ActivityAnalysisMain initialActivity={adaptedActivity} />
    );
  }
  // Interface principale avec widgets (Phase 1)
  console.log("AnalysePage: RENDERING Phase 1 (Calendar and ActivityDetail)");
  return (    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Analyse des activités</h1>
        <p className="text-gray-600">Sélectionnez une activité depuis le calendrier pour l&apos;analyser en détail</p>
      </div>      <div className="flex gap-4">
        {/* Calendrier des activités - Section principale */}
        <div className="flex-shrink-0">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Calendrier des activités</h2>
            <ActivityCalendar
              onDateSelect={handleDateSelect}
              onActivitySelect={handleActivitySelect}
            />
          </div>
        </div>

        {/* Panneau latéral avec les 2 widgets alignés et compacts */}
        <div className="flex flex-col gap-2 min-w-80">
          {/* Détails de l'activité sélectionnée - Version compacte */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-fit">
            <div className="p-3">
              <h3 className="text-base font-semibold text-gray-800 mb-2">Détails de l&apos;activité</h3>
              <ActivityDetail
                activity={selectedActivity}
                onAnalyze={handleAnalyzeActivity}
              />
            </div>
          </div>
          
          {/* Section Dernière activité - Version compacte */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-fit">
            <div className="p-3">
              <h3 className="text-base font-semibold text-gray-800 mb-2">Dernière activité</h3>
              
              {lastActivity ? (
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium text-gray-900 truncate text-sm mb-1">{lastActivity.activity_name}</h4>
                    <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                      {lastActivity.activity_type}
                    </span>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600">Date</span>
                      <span className="text-xs font-medium text-gray-900">{formatDate(lastActivity.start_time)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600">Durée</span>
                      <span className="text-xs font-medium text-gray-900">{formatDuration(lastActivity.duration)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600">Distance</span>
                      <span className="text-xs font-medium text-gray-900">{formatDistance(lastActivity.distance)}</span>
                    </div>
                  </div>                  <button
                    onClick={handleAnalyzeLastActivity}
                    className="w-full mt-3 px-3 py-2 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors duration-200"
                  >
                    Analyser cette activité
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-4 text-center">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mb-2">
                    <svg className="w-4 h-4 text-gray-400" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                  <p className="text-gray-500 text-xs">Aucune activité trouvée</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}