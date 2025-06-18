'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/context/AuthContext';

interface GarminActivity {
  id: string;
  activity_id: string;
  activity_name: string;
  activity_type: string;
  start_time: string;
  duration: number;
  distance: number;
  tcx_file_path?: string;
  gpx_file_path?: string;
  created_at: string;
}

interface DailyActivity {
  date: string;
  activities: GarminActivity[];
  totalDuration: number; // en secondes
  totalDistance: number; // en mètres
}

interface MonthlyData {
  month: number;
  year: number;
  totalHours: number;
  dailyActivities: DailyActivity[];
  maxDailyHours: number; // pour le scaling des barres
}

export function useGarminActivities(year?: number) {
  const [activities, setActivities] = useState<GarminActivity[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, isLoading: authLoading } = useAuth();

  const targetYear = year || new Date().getFullYear();

  const processMonthlyData = useCallback((activitiesData: GarminActivity[]) => {
    console.log('Processing monthly data for', activitiesData.length, 'activities');
    
    const monthlyDataMap = new Map<number, MonthlyData>();

    // Initialiser les données pour tous les mois
    for (let month = 0; month < 12; month++) {
      monthlyDataMap.set(month, {
        month,
        year: targetYear,
        totalHours: 0,
        dailyActivities: [],
        maxDailyHours: 0
      });
    }

    // Grouper les activités par jour
    const dailyActivitiesMap = new Map<string, DailyActivity>();

    activitiesData.forEach(activity => {
      if (!activity.start_time) return;

      const activityDate = new Date(activity.start_time);
      const dateKey = activityDate.toISOString().split('T')[0]; // YYYY-MM-DD

      console.log('Processing activity:', {
        name: activity.activity_name,
        duration: activity.duration,
        durationInHours: (activity.duration || 0) / 3600,
        date: dateKey
      });

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
      
      // S'assurer que la durée est un nombre valide
      const duration = parseFloat(activity.duration?.toString() || '0') || 0;
      dailyActivity.totalDuration += duration;
      dailyActivity.totalDistance += activity.distance || 0;
    });

    // Calculer les données mensuelles
    dailyActivitiesMap.forEach(dailyActivity => {
      const date = new Date(dailyActivity.date);
      const month = date.getMonth();
      
      const monthData = monthlyDataMap.get(month)!;
      monthData.dailyActivities.push(dailyActivity);
      
      const hoursToAdd = dailyActivity.totalDuration / 3600;
      monthData.totalHours += hoursToAdd; // convertir en heures
      
      const dailyHours = dailyActivity.totalDuration / 3600;
      if (dailyHours > monthData.maxDailyHours) {
        monthData.maxDailyHours = dailyHours;
      }
      
      console.log('Day summary:', {
        date: dailyActivity.date,
        month,
        dailyDuration: dailyActivity.totalDuration,
        dailyHours,
        monthTotalHours: monthData.totalHours
      });
    });

    // Convertir en tableau et arrondir les heures
    const processedData = Array.from(monthlyDataMap.values()).map(monthData => ({
      ...monthData,
      totalHours: Math.round(monthData.totalHours * 10) / 10 // arrondir à 1 décimale
    }));
    
    console.log('Final monthly data:', processedData.map(m => ({ 
      month: m.month, 
      totalHours: m.totalHours, 
      activitiesCount: m.dailyActivities.length 
    })));

    setMonthlyData(processedData);
  }, [targetYear]);
  const fetchActivities = useCallback(async () => {
    console.log('fetchActivities called for user:', user?.id);
    
    // Éviter les appels multiples simultanés
    if (loading) {
      console.log('fetchActivities already running, skipping...');
      return;
    }
    
    try {
      if (authLoading) {
        console.log('Auth still loading...');
        return;
      }

      setLoading(true);
      setError(null);

      if (!user) {
        console.log('No user found');
        setError('Utilisateur non authentifié');
        setLoading(false);
        return;
      }

      console.log('Fetching ALL activities for user:', user.id);

      // Ajouter un timeout pour éviter les blocages
      const activitiesPromise = supabase
        .from('garmin_activities')
        .select('*')
        .eq('user_id', user.id)
        .order('start_time', { ascending: true });
        
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Activities fetch timeout')), 10000)
      );

      const { data: allData, error: allError } = await Promise.race([
        activitiesPromise,
        timeoutPromise
      ]);

      console.log('All activities fetched for current user:', allData?.length || 0);

      if (allError) {
        console.error('Error fetching activities:', allError);
        setError('Erreur lors de la récupération des activités');
        return;
      }

      // Debug: examiner les données
      if (allData && allData.length > 0) {
        console.log('Sample activity:', allData[0]);
        console.log('Duration values:', allData.slice(0, 5).map(a => ({ 
          name: a.activity_name, 
          duration: a.duration, 
          type: typeof a.duration,
          start_time: a.start_time 
        })));
        
        // Voir la répartition par année
        const yearStats = allData.reduce((acc, activity) => {
          const year = new Date(activity.start_time).getFullYear();
          acc[year] = (acc[year] || 0) + 1;
          return acc;
        }, {} as Record<number, number>);
        console.log('Activities by year:', yearStats);
      }

      setActivities(allData || []);
      
      // Filtrer pour l'année demandée lors du traitement
      const yearActivities = (allData || []).filter(activity => {
        if (!activity.start_time) return false;
        const activityYear = new Date(activity.start_time).getFullYear();
        return activityYear === targetYear;
      });
      
      console.log(`Activities for year ${targetYear}:`, yearActivities.length);
      processMonthlyData(yearActivities);

    } catch (err) {
      console.error('Erreur:', err);
      setError('Une erreur inattendue s\'est produite');
    } finally {
      setLoading(false);
    }
  }, [user, authLoading, targetYear, processMonthlyData, loading]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const getActivitiesForDate = (date: Date): DailyActivity | undefined => {
    const dateKey = date.toISOString().split('T')[0];
    const month = date.getMonth();
    const monthData = monthlyData.find(m => m.month === month);
    
    return monthData?.dailyActivities.find(d => d.date === dateKey);
  };

  const getActivitiesForMonth = (month: number): DailyActivity[] => {
    const monthData = monthlyData.find(m => m.month === month);
    return monthData?.dailyActivities || [];
  };

  return {
    activities,
    monthlyData,
    loading,
    error,
    getActivitiesForDate,
    getActivitiesForMonth,
    refetch: fetchActivities
  };
}
