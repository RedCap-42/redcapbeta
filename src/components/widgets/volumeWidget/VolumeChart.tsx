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
import VolumeChartModal from './VolumeChartModal';

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
  fit_file_path?: string; // Chemin du fichier FIT
  elevation_gain?: number | null; // Dénivelé positif en mètres
};

// Type pour les données de volume hebdomadaire
type WeeklyVolume = {
  weekStart: string;
  weekEnd: string;
  totalDistance: number;
  totalElevation: number; // Dénivelé total pour la semaine
  month: string;
  isFirstOfMonth: boolean;
};

export default function VolumeChart() {
  const [weeklyVolumes, setWeeklyVolumes] = useState<WeeklyVolume[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showElevation, setShowElevation] = useState(false);
  const [processingElevation, setProcessingElevation] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { user } = useAuth();
  const supabase = createClientComponentClient();

  // Obtenir le début de la semaine (lundi) pour une date donnée - enveloppé dans useCallback
  const getWeekStart = useCallback((date: Date): Date => {
    const day = date.getDay(); // 0 = dimanche, 1 = lundi, etc.
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Ajuster si dimanche
    const monday = new Date(date);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  }, []);

  // Obtenir le nom du mois en français abrégé - enveloppé dans useCallback
  const getMonthName = useCallback((date: Date): string => {
    const months = ['Janv', 'Févr', 'Mars', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];
    return months[date.getMonth()];
  }, []);

  // Fonction pour grouper les activités par semaine - enveloppée dans useCallback
  // Définie AVANT fetchActivities qui l'utilise
  const groupActivitiesByWeek = useCallback((activities: Activity[]): WeeklyVolume[] => {
    const weeklyData: Record<string, { distance: number, elevation: number, weekStart: Date, weekEnd: Date }> = {};

    activities.forEach(activity => {
      // Convertir la date en objet Date
      const activityDate = new Date(activity.start_time);

      // Obtenir le début de la semaine (lundi)
      const weekStart = getWeekStart(activityDate);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6); // Fin de la semaine (dimanche)

      const weekKey = weekStart.toISOString().split('T')[0];

      // Convertir la distance de mètres en kilomètres
      const distanceInKm = activity.distance / 1000;

      // Utiliser le dénivelé de l'activité ou 0 si non disponible
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

    // Nouvelle logique : distribuer les mois uniformément sur le graphique
    if (sortedData.length > 0) {
      // Créer un Set de tous les mois présents dans les données
      const allMonths = new Set<string>();
      sortedData.forEach(week => {
        const weekStart = new Date(week.weekStart);
        const weekEnd = new Date(week.weekEnd);

        // Ajouter le mois du début de semaine
        allMonths.add(`${weekStart.getFullYear()}-${weekStart.getMonth()}`);

        // Si la semaine chevauche sur un autre mois, ajouter aussi ce mois
        if (weekStart.getMonth() !== weekEnd.getMonth()) {
          allMonths.add(`${weekEnd.getFullYear()}-${weekEnd.getMonth()}`);
        }
      });

      // Convertir en tableau trié chronologiquement
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
        // Calculer l'index approximatif où placer ce mois
        let targetIndex;

        if (monthIndex === 0) {
          // Premier mois : au début
          targetIndex = 0;
        } else if (monthIndex === monthsList.length - 1) {
          // Dernier mois : vers la fin mais pas tout à la fin
          targetIndex = Math.max(0, totalWeeks - Math.ceil(totalWeeks / monthsList.length));
        } else {
          // Mois intermédiaires : distribués uniformément
          targetIndex = Math.floor((monthIndex * totalWeeks) / monthsList.length);
        }

        // S'assurer que l'index est valide
        targetIndex = Math.min(targetIndex, totalWeeks - 1);

        // Assigner le label à cette position
        if (sortedData[targetIndex]) {
          sortedData[targetIndex].isFirstOfMonth = true;
          sortedData[targetIndex].month = monthInfo.name;
        }
      });
    }

    return sortedData;
  }, [getWeekStart, getMonthName]);

  // Chargement des données depuis le cache local si disponible
  useEffect(() => {
    // Essayer de récupérer les données du cache local
    try {
      if (typeof window !== 'undefined') {
        // Récupérer les volumes hebdomadaires du cache
        const cachedVolumes = localStorage.getItem('weeklyVolumes');
        if (cachedVolumes) {
          const parsedVolumes = JSON.parse(cachedVolumes) as WeeklyVolume[];
          setWeeklyVolumes(parsedVolumes);
          setIsLoading(false);

          // Récupérer l'état de visibilité de l'élévation du cache
          const cachedShowElevation = localStorage.getItem('showElevation');
          if (cachedShowElevation !== null) {
            setShowElevation(cachedShowElevation === 'true');
          }
        }
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des données du cache:", error);
    }
  }, []);

  // Mise à jour du localStorage quand les données changent
  useEffect(() => {
    if (weeklyVolumes.length > 0 && typeof window !== 'undefined') {
      localStorage.setItem('weeklyVolumes', JSON.stringify(weeklyVolumes));
    }
  }, [weeklyVolumes]);

  // Sauvegarde de l'état du toggle d'élévation
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('showElevation', showElevation.toString());
    }
  }, [showElevation]);

  // Fonction pour mettre à jour le dénivelé d'une activité
  const updateActivityElevation = useCallback(async (activity: Activity): Promise<number> => {
    try {
      if (!activity.fit_file_path) {
        throw new Error("Chemin du fichier FIT non disponible");
      }

      // Télécharger le fichier FIT depuis Supabase Storage
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

      // Utiliser l'utilitaire pour extraire le dénivelé du fichier FIT
      const elevationGain = await extractElevationGain(await fileData.arrayBuffer());

      // Mettre à jour l'activité dans la base de données
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
      setProcessingElevation(true);

      const activitiesToUpdate = activities.filter(
          activity => activity.elevation_gain === null || activity.elevation_gain === 0
      );

      if (activitiesToUpdate.length === 0) {
        console.log("Toutes les activités ont déjà des données d'élévation");
        return activities;
      }

      console.log(`Traitement de ${activitiesToUpdate.length} activités sans données d'élévation`);

      // Traiter les activités en séquence pour éviter de surcharger l'API
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
    } finally {
      setProcessingElevation(false);
    }
  }, [user, updateActivityElevation]);
  // fetchActivities défini APRÈS groupActivitiesByWeek qui est utilisé à l'intérieur
  const fetchActivities = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      // Calculer la date d'il y a 3 mois
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      const threeMonthsAgoISOString = threeMonthsAgo.toISOString();

      // Récupérer les activités des 3 derniers mois
      const { data, error } = await supabase
          .from('garmin_activities')
          .select('id, activity_id, start_time, distance, fit_file_path, elevation_gain')
          .eq('user_id', user.id)
          .gte('start_time', threeMonthsAgoISOString)
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

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // Préparer les données pour le graphique
  const chartData = {
    labels: weeklyVolumes.map(() => ''),
    datasets: [
      {
        label: 'Volume (km)',
        data: weeklyVolumes.map(week => week.totalDistance),
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 2.5, // Ligne légèrement plus épaisse
        pointRadius: 4,
        pointBackgroundColor: 'rgba(59, 130, 246, 1)',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2, // Bordure de point plus visible
        pointHoverRadius: 7, // Point plus grand au survol
        tension: 0.1, // Légère courbure pour un aspect plus doux
        fill: false,
        yAxisID: 'y'
      },

      ...(showElevation ? [
        {
          label: 'Dénivelé positif (m)',
          data: weeklyVolumes.map(week => week.totalElevation),
          borderColor: 'rgba(239, 68, 68, 1)', // Rouge plus vif
          borderWidth: 2.5,
          pointRadius: 4,
          pointBackgroundColor: 'rgba(239, 68, 68, 1)',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointHoverRadius: 7,
          tension: 0.1,
          fill: false,
          yAxisID: 'y1'
        }
      ] : [])
    ]  };

  // Options du graphique
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    onClick: () => {
      setIsModalOpen(true);
    },
    plugins: {
      legend: {
        display: showElevation,
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          boxWidth: 10,
          padding: 15, // Espacement de la légende
          font: { family: 'Inter, sans-serif', size: 12 },
          color: '#4B5563' // Couleur du texte de la légende
        }
      },
      tooltip: {
        backgroundColor: 'rgba(31, 41, 55, 0.9)', // Fond de tooltip plus sombre
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        titleFont: {
          size: 13, // Taille du titre du tooltip
          weight: 'bold' as const,
          family: 'Inter, sans-serif'
        },
        bodyFont: {
          size: 12,
          family: 'Inter, sans-serif'
        },
        callbacks: {
          title: (context: {dataIndex: number}[]) => {
            const index = context[0].dataIndex;
            const week = weeklyVolumes[index];
            if (week) {
              const startDate = new Date(week.weekStart).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
              const endDate = new Date(week.weekEnd).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
              return `${startDate} - ${endDate}`;
            }
            return '';
          },
          label: function(context: TooltipItem<'line'>) {
            const datasetIndex = context.datasetIndex;
            if (datasetIndex === 0) {
              return `Volume: ${context.parsed.y} km`;
            } else if (datasetIndex === 1 && showElevation) {
              return `Dénivelé: ${context.parsed.y} m`;
            }
            return '';
          }
        },
        padding: 10 // Padding interne du tooltip
      }
    },
    scales: {
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        beginAtZero: true,        title: {
          display: true,
          text: 'Kilomètres',
          color: '#4B5563',
          font: { family: 'Inter, sans-serif', size: 12, weight: 500 }
        },
        grid: {
          display: true,
          color: 'rgba(229, 231, 235, 0.6)' // Grille légèrement plus visible
        },
        ticks: {
          font: { family: 'Inter, sans-serif' },
          color: '#6B7280'
        }
      },

      ...(showElevation ? {        y1: {
          type: 'linear' as const,
          display: true,
          position: 'right' as const,
          beginAtZero: true,
          title: {
            display: true,
            text: 'Dénivelé (m)',
            color: 'rgba(239, 68, 68, 1)',
            font: { family: 'Inter, sans-serif', size: 12, weight: 500 }
          },
          grid: {
            display: false
          },
          ticks: {
            font: { family: 'Inter, sans-serif' },
            color: 'rgba(239, 68, 68, 0.8)' // Couleur des ticks pour l'axe du dénivelé
          }
        }
      } : {}),
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
          color: '#4B5563', // Couleur des ticks de l'axe X
          font: {
            weight: 500, // Changé de "500" (string) à 500 (number)
            family: 'Inter, sans-serif',
            size: 11 // Taille de police pour les mois
          },
          maxRotation: 0,
          padding: 10 // Espacement des ticks de l'axe X
        }
      }
    }
  };  if (isLoading) {
    return (
        <div className="flex justify-center items-center h-96 bg-white rounded-lg shadow border border-gray-200">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-600"></div>
          <span className="ml-3 text-gray-600">Chargement du volume...</span>
        </div>
    );
  }

  if (error) {
    return (
        <div className="h-96 bg-white rounded-lg shadow border border-gray-200 p-6 flex flex-col justify-center items-center">
          <svg className="w-16 h-16 text-red-400 mb-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <p className="text-red-600 font-semibold mb-1">Erreur de chargement</p>
          <p className="text-gray-500 text-sm text-center">{error}</p>
        </div>
    );
  }

  if (weeklyVolumes.length === 0) {
    return (
        <div className="h-96 bg-white rounded-lg shadow border border-gray-200 p-6 flex flex-col justify-center items-center">
           <svg className="w-16 h-16 text-blue-400 mb-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
          <p className="text-blue-600 font-semibold mb-1">Aucune donnée d&apos;entraînement</p>
          <p className="text-gray-500 text-sm text-center">
            Synchronisez vos activités pour visualiser votre volume hebdomadaire.
          </p>
        </div>
    );
  }

  // Calculer le total du volume et du dénivelé sur la période
  const totalVolume = weeklyVolumes.reduce((sum, week) => sum + week.totalDistance, 0).toFixed(1);
  const totalElevation = weeklyVolumes.reduce((sum, week) => sum + week.totalElevation, 0);
  return (
      <div className="bg-white rounded-lg shadow p-4">        <div className="flex flex-col sm:flex-row justify-between gap-2 sm:items-start mb-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Volume d&apos;entraînement hebdomadaire</h3>
            <div className="text-sm text-gray-600">3 derniers mois</div>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <ElevationToggle onChange={setShowElevation} initialValue={showElevation} />
            <div className="flex items-center space-x-3 text-sm font-medium">
            <span className="text-indigo-600">
              Total: {totalVolume} km
            </span>
              {showElevation && (
                  <span className="text-red-600">
                D+: {totalElevation} m
              </span>
              )}
            </div>
          </div>
        </div>

        {processingElevation && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700 p-3 mb-3 text-sm flex items-center rounded-r-md">
              <svg className="animate-spin h-4 w-4 text-yellow-500 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Calcul des données de dénivelé en cours...</span>
            </div>
        )}        <div className="h-64 cursor-pointer relative group"> {/* Hauteur standardisée pour le graphique */}
          <Line data={chartData} options={chartOptions} />
        </div>

        {/* Modal pour l'affichage en plein écran */}
        <VolumeChartModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
        />
      </div>
  );
}