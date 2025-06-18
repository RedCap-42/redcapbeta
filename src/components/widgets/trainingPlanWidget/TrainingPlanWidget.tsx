'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useAuth } from '@/context/AuthContext';

interface Activity {
  id: string;
  activity_name: string;
  activity_type: string;
  start_time: string;
  distance: number;
}

export default function TrainingPlanWidget() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const supabase = createClientComponentClient();
  const { user } = useAuth();

  // Charger les activités récentes
  const loadActivities = useCallback(async () => {
    if (!user) return;

    try {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const { data } = await supabase
        .from('garmin_activities')
        .select('id, activity_name, activity_type, start_time, distance')
        .eq('user_id', user.id)
        .gte('start_time', threeMonthsAgo.toISOString())
        .order('start_time', { ascending: false })
        .limit(5);

      setActivities(data || []);
    } catch (err) {
      console.error('Erreur:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user, supabase]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit'
    });
  };

  const formatDistance = (distance: number) => {
    return (distance / 1000).toFixed(1) + 'km';
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold mb-3">Training Plan</h3>
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-8 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold mb-3">Training Plan</h3>
      
      {activities.length === 0 ? (
        <p className="text-gray-500 text-sm">Aucune activité récente</p>
      ) : (
        <div className="space-y-2">
          {activities.map((activity) => (
            <div key={activity.id} className="flex justify-between items-center py-1 text-sm">
              <div className="flex items-center space-x-2">
                <span>🏃</span>
                <span className="font-medium truncate max-w-32">
                  {activity.activity_name || 'Course'}
                </span>
              </div>
              <div className="flex items-center space-x-2 text-gray-600">
                <span>{formatDistance(activity.distance)}</span>
                <span>{formatDate(activity.start_time)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
