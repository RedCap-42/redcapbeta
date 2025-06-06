"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import ActivityCalendar from "@/components/ActivityCalendar";
import ActivityDetail from "@/components/ActivityDetail";
import ActivityAnalysisDetail from "@/components/activityAnalysis/ActivityAnalysisDetail";

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

export default function AnalysePage() {
  // États
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [isDetailedAnalysisMode, setIsDetailedAnalysisMode] = useState(false);

  // Log component render and state
  console.log(
    `AnalysePage RENDER - isLoading: ${isLoading}, selectedDate: ${selectedDate}, selectedActivity: ${selectedActivity ? selectedActivity.id : 'null'}, isDetailedAnalysisMode: ${isDetailedAnalysisMode}`
  );

  // Auth et base de données
  const { user } = useAuth();
  const supabase = createClientComponentClient();

  // Effet pour vérifier l'authentification
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(false);
  }, [user]);

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
    }
  }

  // Fonction pour revenir à la vue principale
  function handleBackToOverview() {
    console.log("AnalysePage: handleBackToOverview CALLED. Setting isDetailedAnalysisMode to false.");
    setIsDetailedAnalysisMode(false);
  }

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

  // Affichage pendant le chargement
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-64px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  // Interface d'analyse détaillée (Phase 2)
  if (isDetailedAnalysisMode && selectedActivity) {
    console.log("AnalysePage: RENDERING Phase 2 (ActivityAnalysisDetail) for activity:", selectedActivity.id);
    return (
      <div className="container mx-auto p-6">
        <ActivityAnalysisDetail activity={selectedActivity} onBackAction={handleBackToOverview} />
      </div>
    );
  }

  // Interface principale avec widgets (Phase 1)
  console.log("AnalysePage: RENDERING Phase 1 (Calendar and ActivityDetail)");
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Analyse des activités</h1>

      {isDetailedAnalysisMode && selectedActivity ? (
        <ActivityAnalysisDetail activity={selectedActivity} onBackAction={() => setIsDetailedAnalysisMode(false)} />
      ) : (
        <div className="flex flex-col md:flex-row gap-4">
          <div>
            <ActivityCalendar
              onDateSelect={handleDateSelect}
              onActivitySelect={handleActivitySelect}
            />
          </div>
          <div>
            <ActivityDetail
              activity={selectedActivity}
              onAnalyze={handleAnalyzeActivity}
            />
          </div>
        </div>
      )}
    </div>
  );
}