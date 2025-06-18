'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useAuth } from '@/context/AuthContext';

interface GarminActivity {
  id: string;
  activity_id: string;
  activity_name: string;
  activity_type: string;
  start_time: string;
  duration: number;
  distance: number;
  user_id: string;
}

interface DailyActivity {
  date: string; // Format YYYY-MM-DD
  activities: GarminActivity[];
  totalDuration: number; // en secondes
  totalDistance: number; // en mètres
}

interface MonthlyData {
  month: number; // 0-11
  year: number;
  totalHours: number;
  totalActivities: number;
  dailyActivities: DailyActivity[];
  maxDailyHours: number; // pour le scaling des barres
}

export function useTrainingPlanData(year?: number) {
  const [activities, setActivities] = useState<GarminActivity[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const supabase = createClientComponentClient();

  const targetYear = year || new Date().getFullYear();

  // Fonction pour traiter les données mensuelles
  const processMonthlyData = useCallback((allActivities: GarminActivity[]) => {
    console.log('🎯 Processing training plan data for', allActivities.length, 'activities');
    
    // Initialiser les données pour tous les mois de l'année
    const monthlyDataMap = new Map<number, MonthlyData>();
    for (let month = 0; month < 12; month++) {
      monthlyDataMap.set(month, {
        month,
        year: targetYear,
        totalHours: 0,
        totalActivities: 0,
        dailyActivities: [],
        maxDailyHours: 0
      });
    }

    // Filtrer les activités pour l'année cible
    const yearActivities = allActivities.filter(activity => {
      if (!activity.start_time) return false;
      const activityYear = new Date(activity.start_time).getFullYear();
      return activityYear === targetYear;
    });

    console.log(`📅 Found ${yearActivities.length} activities for year ${targetYear}`);

    // Grouper les activités par jour
    const dailyActivitiesMap = new Map<string, DailyActivity>();

    yearActivities.forEach(activity => {
      const activityDate = new Date(activity.start_time);
      const dateKey = activityDate.toISOString().split('T')[0]; // YYYY-MM-DD
      
      if (!dailyActivitiesMap.has(dateKey)) {
        dailyActivitiesMap.set(dateKey, {
          date: dateKey,
          activities: [],
          totalDuration: 0,
          totalDistance: 0
        });
      }

      const dailyActivity = dailyActivitiesMap.get(dateKey)!;
      dailyActivity.activities.push(activity);
      
      // Convertir la durée en nombre et l'ajouter
      const duration = Number(activity.duration) || 0;
      const distance = Number(activity.distance) || 0;
      
      dailyActivity.totalDuration += duration;
      dailyActivity.totalDistance += distance;

      console.log(`📊 Activity: ${activity.activity_name} - ${duration}s (${(duration/3600).toFixed(1)}h) on ${dateKey}`);
    });

    // Calculer les données mensuelles
    dailyActivitiesMap.forEach(dailyActivity => {
      const date = new Date(dailyActivity.date);
      const month = date.getMonth();
      
      const monthData = monthlyDataMap.get(month)!;
      monthData.dailyActivities.push(dailyActivity);
      
      // Calculer les heures pour ce jour
      const dailyHours = dailyActivity.totalDuration / 3600;
      monthData.totalHours += dailyHours;
      monthData.totalActivities += dailyActivity.activities.length;
      
      // Mettre à jour le maximum quotidien pour ce mois
      if (dailyHours > monthData.maxDailyHours) {
        monthData.maxDailyHours = dailyHours;
      }
    });

    // Convertir en tableau et trier les activités par date
    const processedData = Array.from(monthlyDataMap.values()).map(monthData => ({
      ...monthData,
      totalHours: Math.round(monthData.totalHours * 10) / 10, // arrondir à 1 décimale
      dailyActivities: monthData.dailyActivities.sort((a, b) => a.date.localeCompare(b.date))
    }));
    
    console.log('📈 Monthly summary:', processedData.map(m => ({ 
      month: m.month, 
      totalHours: m.totalHours,
      totalActivities: m.totalActivities,
      daysWithActivities: m.dailyActivities.length 
    })));

    setMonthlyData(processedData);
  }, [targetYear]);

  // Fonction pour charger toutes les activités
  const fetchActivities = useCallback(async () => {
    if (!user) {
      setError('Utilisateur non authentifié');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Fetching activities for user:', user.id);

      // Récupérer TOUTES les activités de l'utilisateur (pas de filtre sur l'année ici)
      const { data, error } = await supabase
        .from('garmin_activities')
        .select('*')
        .eq('user_id', user.id)
        .order('start_time', { ascending: true });

      if (error) {
        console.error('❌ Error fetching activities:', error);
        setError('Erreur lors de la récupération des activités');
        return;
      }

      console.log(`✅ Successfully fetched ${data?.length || 0} activities`);
      
      // Vérifier quelques échantillons de durées
      if (data && data.length > 0) {
        console.log('🔍 Sample durations:', data.slice(0, 3).map(a => ({
          name: a.activity_name,
          duration: a.duration,
          durationHours: (Number(a.duration) / 3600).toFixed(2),
          date: a.start_time
        })));
      }

      setActivities(data || []);
      processMonthlyData(data || []);

    } catch (err) {
      console.error('💥 Unexpected error:', err);
      setError('Une erreur inattendue s\'est produite');
    } finally {
      setLoading(false);
    }
  }, [user, processMonthlyData, supabase]);

  // Charger les données au montage du composant
  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // Fonction pour obtenir les activités d'une date spécifique
  const getActivitiesForDate = useCallback((date: Date): DailyActivity | undefined => {
    const dateKey = date.toISOString().split('T')[0];
    const month = date.getMonth();
    const monthData = monthlyData.find(m => m.month === month);
    
    return monthData?.dailyActivities.find(d => d.date === dateKey);
  }, [monthlyData]);

  // Fonction pour obtenir toutes les activités d'un mois
  const getActivitiesForMonth = useCallback((month: number): DailyActivity[] => {
    const monthData = monthlyData.find(m => m.month === month);
    return monthData?.dailyActivities || [];
  }, [monthlyData]);

  // Fonction pour obtenir le résumé annuel
  const getYearSummary = useCallback(() => {
    const totalHours = monthlyData.reduce((sum, month) => sum + month.totalHours, 0);
    const totalActivities = monthlyData.reduce((sum, month) => sum + month.totalActivities, 0);
    const activeDays = monthlyData.reduce((sum, month) => sum + month.dailyActivities.length, 0);
    
    return {
      totalHours: Math.round(totalHours * 10) / 10,
      totalActivities,
      activeDays,
      averageHoursPerMonth: Math.round((totalHours / 12) * 10) / 10
    };
  }, [monthlyData]);

  return {
    activities,
    monthlyData,
    loading,
    error,
    getActivitiesForDate,
    getActivitiesForMonth,
    getYearSummary,
    refetch: fetchActivities
  };
}
