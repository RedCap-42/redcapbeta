'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useAuth } from '@/context/AuthContext';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TooltipItem
} from 'chart.js';
import { extractElevationGain } from '@/utils/fitFileProcessor';
import ElevationToggle from './ElevationToggle';

// Enregistrer les composants nécessaires pour Chart.js
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

// Type pour les activités
type Activity = {
  id: string;
  activity_id: number;
  start_time: string;
  distance: number;
  fit_file_path?: string;
  elevation_gain?: number | null;
};

// Type pour les données de volume hebdomadaire
type WeeklyVolume = {
  weekStart: string;
  weekEnd: string;
  totalDistance: number;
  totalElevation: number;
  month: string;
  isFirstOfMonth: boolean;
};

interface VolumeChartModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function VolumeChartModal({ isOpen, onClose }: VolumeChartModalProps) {
  const { user } = useAuth();
  const supabase = createClientComponentClient();
  const [weeklyVolumes, setWeeklyVolumes] = useState<WeeklyVolume[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);  const [showElevation, setShowElevation] = useState(false);

  // Obtenir le début de la semaine (lundi) pour une date donnée
  const getWeekStart = useCallback((date: Date): Date => {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  }, []);

  // Obtenir le nom du mois en français abrégé
  const getMonthName = useCallback((date: Date): string => {
    const months = ['Janv', 'Févr', 'Mars', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];
    return months[date.getMonth()];
  }, []);

  // Fonction pour grouper les activités par semaine
  const groupActivitiesByWeek = useCallback((activities: Activity[]): WeeklyVolume[] => {
    const weeklyData: Record<string, { distance: number, elevation: number, weekStart: Date, weekEnd: Date }> = {};

    activities.forEach(activity => {
      const activityDate = new Date(activity.start_time);
      const weekStart = getWeekStart(activityDate);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      const weekKey = weekStart.toISOString().split('T')[0];
      const distanceInKm = (activity.distance || 0) / 1000;
      const elevationGain = activity.elevation_gain || 0;

      if (weeklyData[weekKey]) {
        weeklyData[weekKey].distance += distanceInKm;
        weeklyData[weekKey].elevation += elevationGain;
      } else {
        weeklyData[weekKey] = {
          distance: distanceInKm,
          elevation: elevationGain,
          weekStart: weekStart,
          weekEnd: weekEnd
        };
      }
    });

    // Convertir l'objet en tableau et trier par date
    const sortedData = Object.entries(weeklyData)
        .map(([weekKey, data]) => {
          return {
            weekStart: weekKey,
            weekEnd: data.weekEnd.toISOString().split('T')[0],
            totalDistance: parseFloat(data.distance.toFixed(1)),
            totalElevation: Math.round(data.elevation),
            month: '',
            isFirstOfMonth: false
          };
        })
        .sort((a, b) => a.weekStart.localeCompare(b.weekStart));

    // Logique pour distribuer les mois uniformément sur le graphique
    if (sortedData.length > 0) {
      const allMonths = new Set<string>();
      sortedData.forEach(week => {
        const weekStart = new Date(week.weekStart);
        const weekEnd = new Date(week.weekEnd);

        allMonths.add(`${weekStart.getFullYear()}-${weekStart.getMonth()}`);

        if (weekStart.getMonth() !== weekEnd.getMonth()) {
          allMonths.add(`${weekEnd.getFullYear()}-${weekEnd.getMonth()}`);
        }
      });

      const monthsList = Array.from(allMonths)
          .map(monthKey => {
            const [year, month] = monthKey.split('-');
            return {
              key: monthKey,
              year: parseInt(year),
              month: parseInt(month),
              name: getMonthName(new Date(parseInt(year), parseInt(month), 1))
            };
          })
          .sort((a, b) => {
            if (a.year !== b.year) return a.year - b.year;
            return a.month - b.month;
          });

      // Distribuer les labels de mois sur le graphique
      const totalWeeks = sortedData.length;
      monthsList.forEach((monthInfo, monthIndex) => {
        let targetIndex;

        if (monthIndex === 0) {
          targetIndex = 0;
        } else if (monthIndex === monthsList.length - 1) {
          targetIndex = Math.max(0, totalWeeks - Math.ceil(totalWeeks / monthsList.length));
        } else {
          targetIndex = Math.floor((monthIndex * totalWeeks) / monthsList.length);
        }

        targetIndex = Math.min(targetIndex, totalWeeks - 1);

        if (sortedData[targetIndex]) {
          sortedData[targetIndex].isFirstOfMonth = true;
          sortedData[targetIndex].month = monthInfo.name;
        }
      });
    }

    return sortedData;
  }, [getWeekStart, getMonthName]);

  // Fonction pour mettre à jour le dénivelé d'une activité
  const updateActivityElevation = useCallback(async (activity: Activity): Promise<number> => {
    try {
      if (!activity.fit_file_path) {
        throw new Error("Chemin du fichier FIT non disponible");
      }

      const { data: fileData, error: fileError } = await supabase
          .storage
          .from('database')
          .download(activity.fit_file_path);

      if (fileError) {
        throw fileError;
      }

      if (!fileData) {
        throw new Error("Impossible de charger le fichier FIT");
      }

      const elevationGain = await extractElevationGain(await fileData.arrayBuffer());

      const { error: updateError } = await supabase
          .from('garmin_activities')
          .update({ elevation_gain: elevationGain })
          .eq('id', activity.id);

      if (updateError) {
        throw updateError;
      }

      return elevationGain;
    } catch (err: unknown) {
      const typedError = err as { message: string };
      console.error(`Erreur lors de la mise à jour du dénivelé pour l'activité ${activity.id}:`, typedError.message);
      return 0;
    }
  }, [supabase]);
  // Fonction pour vérifier et mettre à jour les données d'élévation manquantes
  const processElevationData = useCallback(async (activities: Activity[]) => {
    if (!user) return activities;

    try {
      const activitiesToUpdate = activities.filter(
          activity => activity.elevation_gain === null || activity.elevation_gain === 0
      );

      if (activitiesToUpdate.length === 0) {
        return activities;
      }

      const updatedActivities = [...activities];

      for (const activity of activitiesToUpdate) {
        const index = updatedActivities.findIndex(a => a.id === activity.id);
        if (index !== -1) {
          const elevationGain = await updateActivityElevation(activity);
          updatedActivities[index] = { ...updatedActivities[index], elevation_gain: elevationGain };
        }
      }

      return updatedActivities;
    } catch (err: unknown) {
      const typedError = err as { message: string };
      console.error("Erreur lors du traitement des données d'élévation:", typedError.message);
      return activities;
    }
  }, [user, updateActivityElevation]);

  // Fonction pour récupérer toutes les activités historiques
  const fetchAllActivities = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      // Récupérer TOUTES les activités de l'utilisateur
      const { data, error } = await supabase
          .from('garmin_activities')
          .select('id, activity_id, start_time, distance, fit_file_path, elevation_gain')
          .eq('user_id', user.id)
          .order('start_time', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        setWeeklyVolumes([]);
        return;
      }

      // Vérifier et mettre à jour les données d'élévation si nécessaire
      const activitiesWithElevation = await processElevationData(data);

      // Organiser les activités par semaine
      const activitiesByWeek = groupActivitiesByWeek(activitiesWithElevation);
      setWeeklyVolumes(activitiesByWeek);
    } catch (err: unknown) {
      const typedError = err as { message: string };
      setError(typedError.message || 'Erreur lors du chargement des données');
      console.error('Erreur lors du chargement des activités:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user, supabase, processElevationData, groupActivitiesByWeek]);

  // Charger les données quand la modal s'ouvre
  useEffect(() => {
    if (isOpen && user) {
      fetchAllActivities();
    }
  }, [isOpen, user, fetchAllActivities]);

  // Préparer les données pour le graphique
  const chartData = {
    labels: weeklyVolumes.map(() => ''),
    datasets: [
      {
        label: 'Volume (km)',
        data: weeklyVolumes.map(week => week.totalDistance),
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 2.5,
        pointRadius: 4,
        pointBackgroundColor: 'rgba(59, 130, 246, 1)',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointHoverRadius: 7,
        pointHoverBackgroundColor: 'rgba(59, 130, 246, 1)',
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 2,
        tension: 0.1,
        yAxisID: 'y',
        fill: false
      },      ...(showElevation ? [{
        label: 'D+ (m)',
        data: weeklyVolumes.map(week => week.totalElevation),
        borderColor: 'rgba(239, 68, 68, 1)', // Rouge
        borderWidth: 2.5,
        pointRadius: 4,
        pointBackgroundColor: 'rgba(239, 68, 68, 1)', // Rouge
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointHoverRadius: 7,
        pointHoverBackgroundColor: 'rgba(239, 68, 68, 1)', // Rouge
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 2,
        tension: 0.1,
        yAxisID: 'y1',
        fill: false
      }] : [])
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          boxWidth: 10,
          padding: 15
        }
      },
      tooltip: {
        callbacks: {
          title: (context: TooltipItem<"line">[]) => {
            const index = context[0].dataIndex;
            const week = weeklyVolumes[index];
            if (week) {
              const startDate = new Date(week.weekStart);
              const endDate = new Date(week.weekEnd);
              return `${startDate.getDate()}/${startDate.getMonth() + 1} - ${endDate.getDate()}/${endDate.getMonth() + 1}/${endDate.getFullYear()}`;
            }
            return '';
          },
          label: (context: TooltipItem<"line">) => {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            if (label.includes('Volume')) {
              return `${label}: ${value.toFixed(1)} km`;
            } else if (label.includes('D+')) {
              return `${label}: ${Math.round(value)} m`;
            }
            return `${label}: ${value}`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          callback: function(val: unknown, index: number) {
            const week = weeklyVolumes[index];
            if (week?.isFirstOfMonth) {
              return week.month;
            }
            return '';
          },
          color: '#666',
          font: {
            weight: 'bold' as const
          },
          maxRotation: 0
        }
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Volume (km)',
          color: '#3B82F6',
          font: {
            size: 12,
            weight: 'bold' as const
          }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          color: '#3B82F6',
          font: {
            size: 11
          }
        }
      },
      ...(showElevation ? {        y1: {
          type: 'linear' as const,
          display: true,
          position: 'right' as const,
          title: {
            display: true,
            text: 'Dénivelé (m)',
            color: '#EF4444', // Rouge
            font: {
              size: 12,
              weight: 'bold' as const
            }
          },
          grid: {
            drawOnChartArea: false
          },
          ticks: {
            color: '#EF4444', // Rouge
            font: {
              size: 11
            }
          }
        }
      } : {})
    }
  };  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* En-tête de la modal */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>            <h2 className="text-xl font-bold text-gray-800">Volume d&apos;entraînement historique</h2>
            <p className="text-sm text-gray-600">Toutes vos activités depuis le début</p>
          </div>
          <div className="flex items-center gap-4">            <ElevationToggle 
              onChange={setShowElevation}
              initialValue={showElevation}
            />
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Contenu de la modal */}
        <div className="p-6">
          {isLoading ? (
            <div className="flex justify-center items-center h-96">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Chargement des données historiques...</span>
            </div>
          ) : error ? (
            <div className="flex justify-center items-center h-96">
              <div className="text-center">
                <svg className="w-16 h-16 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-600 font-semibold mb-1">Erreur de chargement</p>
                <p className="text-gray-500 text-sm">{error}</p>
              </div>
            </div>
          ) : weeklyVolumes.length === 0 ? (
            <div className="flex justify-center items-center h-96">
              <div className="text-center">
                <svg className="w-16 h-16 text-blue-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p className="text-blue-600 font-semibold mb-1">Aucune donnée d&apos;entraînement</p>
                <p className="text-gray-500 text-sm">Synchronisez vos activités pour visualiser votre historique.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="h-96 mb-4">
                <Line data={chartData} options={chartOptions} />
              </div>
              
              {/* Statistiques */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {weeklyVolumes.reduce((sum, week) => sum + week.totalDistance, 0).toFixed(1)}
                  </div>
                  <div className="text-sm text-gray-600">km total</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {Math.round(weeklyVolumes.reduce((sum, week) => sum + week.totalElevation, 0))}
                  </div>
                  <div className="text-sm text-gray-600">m D+ total</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {weeklyVolumes.length}
                  </div>
                  <div className="text-sm text-gray-600">semaines</div>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {weeklyVolumes.length > 0 ? 
                      (weeklyVolumes.reduce((sum, week) => sum + week.totalDistance, 0) / weeklyVolumes.length).toFixed(1) : 
                      '0'
                    }
                  </div>
                  <div className="text-sm text-gray-600">km/semaine moy.</div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
