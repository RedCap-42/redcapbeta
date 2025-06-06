'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  TooltipItem
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import DisplayModeToggle from './DisplayModeToggle';

// Enregistrer les composants nécessaires pour Chart.js
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

interface TrainingTypeData {
  week: string;
  trailPercentage: number;
  roadPercentage: number;
  month?: string;
  isFirstOfMonth?: boolean;
}

interface MonthlyTrainingTypeData {
  month: string;
  trailPercentage: number;
  roadPercentage: number;
}

export default function TrainingTypeChart() {
  const [trainingTypeData, setTrainingTypeData] = useState<TrainingTypeData[]>([]);
  const [monthlyTrainingTypeData, setMonthlyTrainingTypeData] = useState<MonthlyTrainingTypeData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showByMonth, setShowByMonth] = useState<boolean>(false);
  const supabase = createClientComponentClient();

  // Obtenir le début de la semaine (lundi) pour une date donnée
  const getWeekStart = (date: Date) => {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Ajuster pour que la semaine commence le lundi
    return new Date(date.setDate(diff));
  };

  // Formater l'étiquette de semaine (ex: "10-16 Jan")
  const formatWeekLabel = (weekStart: string) => {
    const startDate = new Date(weekStart);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);

    const startDay = startDate.getDate();
    const endDay = endDate.getDate();
    const month = startDate.toLocaleDateString('fr-FR', { month: 'short' });

    return `${startDay}-${endDay} ${month}`;
  };

  // Formater l'étiquette de mois (ex: "Janvier 2025")
  const formatMonthLabel = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  };

  // Obtenir le nom du mois en français abrégé
  const getMonthName = (date: Date): string => {
    const months = ['Janv', 'Févr', 'Mars', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];
    return months[date.getMonth()];
  };

  // Ajouter les informations de mois aux données - enveloppé dans useCallback
  const addMonthInfo = useCallback((data: TrainingTypeData[]): TrainingTypeData[] => {
    if (data.length === 0) return [];

    // Convertir chaque élément de données pour y ajouter les informations de mois
    const result = data.map(item => ({
      ...item,
      isFirstOfMonth: false,
      month: ''
    }));

    // Obtenir la première et la dernière date pour déterminer la plage totale
    const firstWeekStr = data[0].week;
    const lastWeekStr = data[data.length - 1].week;

    // Extraire et créer des dates à partir des formats de semaine (comme "10-16 Mai")
    const currentYear = new Date().getFullYear();
    const months = ['janv', 'févr', 'mars', 'avr', 'mai', 'juin', 'juil', 'août', 'sept', 'oct', 'nov', 'déc'];

    // Analyser la date de la première semaine
    const firstMonthStr = firstWeekStr.split(' ')[1].toLowerCase();
    const firstMonthIndex = months.findIndex(m => firstMonthStr.startsWith(m));
    const firstMonth = firstMonthIndex === -1 ? 0 : firstMonthIndex;

    // Analyser la date de la dernière semaine
    const lastMonthStr = lastWeekStr.split(' ')[1].toLowerCase();
    const lastMonthIndex = months.findIndex(m => lastMonthStr.startsWith(m));
    const lastMonth = lastMonthIndex === -1 ? 11 : lastMonthIndex;

    // Ajuster pour prendre en compte les changements d'année
    let totalMonths = (lastMonth >= firstMonth) ?
        (lastMonth - firstMonth + 1) :
        (12 - firstMonth + lastMonth + 1);

    // S'assurer que nous avons au moins tous les mois dans la période
    if (totalMonths === 0) totalMonths = 1;

    // Distribuer uniformément les mois sur l'ensemble des données
    // Diviser les données en sections égales, une pour chaque mois
    const sectionSize = data.length / totalMonths;

    // Pour chaque section, marquer un point comme début de mois
    for (let i = 0; i < totalMonths; i++) {
      // Calculer l'index approximatif pour ce mois
      let index = Math.floor(i * sectionSize);

      // Ajuster pour éviter les dépassements
      index = Math.min(index, data.length - 1);

      // Calculer le mois à afficher
      const monthIndex = (firstMonth + i) % 12;
      const monthName = getMonthName(new Date(currentYear, monthIndex));

      // Marquer cette entrée comme début de mois
      result[index].isFirstOfMonth = true;
      result[index].month = monthName;
    }

    return result;
  }, []);

  // Correction du useEffect pour inclure la dépendance manquante addMonthInfo
  useEffect(() => {
    const fetchTrainingTypeData = async () => {
      try {
        setIsLoading(true);

        // Récupérer l'utilisateur connecté
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          throw new Error('Utilisateur non connecté');
        }

        // Récupérer les activités de l'utilisateur
        const { data: activities, error } = await supabase
            .from('garmin_activities')
            .select('activity_type, start_time')
            .eq('user_id', user.id)
            .order('start_time', { ascending: true });

        if (error) {
          throw error;
        }

        if (!activities || activities.length === 0) {
          setTrainingTypeData([]);
          setMonthlyTrainingTypeData([]);
          setIsLoading(false);
          return;
        }

        // Organiser les activités par semaine
        const weeklyData = new Map<string, { trail: number, road: number }>();
        const monthlyData = new Map<string, { trail: number, road: number }>();

        activities.forEach(activity => {
          const activityDate = new Date(activity.start_time);

          // Traitement pour les données hebdomadaires
          const weekStart = getWeekStart(activityDate);
          const weekKey = weekStart.toISOString().split('T')[0];

          if (!weeklyData.has(weekKey)) {
            weeklyData.set(weekKey, { trail: 0, road: 0 });
          }

          const currentWeekData = weeklyData.get(weekKey);

          // Traitement pour les données mensuelles
          const monthKey = `${activityDate.getFullYear()}-${String(activityDate.getMonth() + 1).padStart(2, '0')}`;

          if (!monthlyData.has(monthKey)) {
            monthlyData.set(monthKey, { trail: 0, road: 0 });
          }

          const currentMonthData = monthlyData.get(monthKey);

          if (currentWeekData && currentMonthData) {
            if (activity.activity_type === 'trail_running') {
              currentWeekData.trail += 1;
              currentMonthData.trail += 1;
            } else {
              // Considérer tout autre type comme 'running' (course sur route)
              currentWeekData.road += 1;
              currentMonthData.road += 1;
            }
          }
        });

        // Convertir les données hebdomadaires en pourcentages
        const processedWeeklyData: TrainingTypeData[] = Array.from(weeklyData.entries())
            .sort(([weekA], [weekB]) => weekA.localeCompare(weekB))
            .map(([week, counts]) => {
              const total = counts.trail + counts.road;
              const trailPercentage = total > 0 ? (counts.trail / total) * 100 : 0;
              return {
                week: formatWeekLabel(week),
                trailPercentage: Math.round(trailPercentage),
                roadPercentage: Math.round(100 - trailPercentage)
              };
            });

        // Convertir les données mensuelles en pourcentages
        const processedMonthlyData: MonthlyTrainingTypeData[] = Array.from(monthlyData.entries())
            .sort(([monthA], [monthB]) => monthA.localeCompare(monthB))
            .map(([month, counts]) => {
              const total = counts.trail + counts.road;
              const trailPercentage = total > 0 ? (counts.trail / total) * 100 : 0;
              return {
                month: formatMonthLabel(month),
                trailPercentage: Math.round(trailPercentage),
                roadPercentage: Math.round(100 - trailPercentage)
              };
            });

        // Ajouter les informations de mois pour l'affichage hebdomadaire
        const dataWithMonths = addMonthInfo(processedWeeklyData);

        setTrainingTypeData(dataWithMonths);
        setMonthlyTrainingTypeData(processedMonthlyData);
      } catch (err) {
        console.error('Erreur lors de la récupération des données de type d\'entraînement:', err);
        setError('Impossible de charger les données de type d\'entraînement');
      } finally {
        setIsLoading(false);
      }
    }

    fetchTrainingTypeData();
  }, [supabase, addMonthInfo]);

  // Préparer les données pour le graphique selon le mode d'affichage
  const chartData = {
    labels: showByMonth
        ? monthlyTrainingTypeData.map(data => data.month)
        : trainingTypeData.map(data => data.week),
    datasets: [
      {
        label: 'Course sur route',
        data: showByMonth
            ? monthlyTrainingTypeData.map(data => data.roadPercentage)
            : trainingTypeData.map(data => data.roadPercentage),
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 2,
        tension: 0.3,
        pointRadius: 4,
        pointBackgroundColor: 'rgba(54, 162, 235, 1)',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 1.5,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: 'rgba(54, 162, 235, 1)',
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 2,
        fill: false,
      },
      {
        label: 'Trail',
        data: showByMonth
            ? monthlyTrainingTypeData.map(data => data.trailPercentage)
            : trainingTypeData.map(data => data.trailPercentage),
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 2,
        tension: 0.3,
        pointRadius: 4,
        pointBackgroundColor: 'rgba(255, 99, 132, 1)',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 1.5,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: 'rgba(255, 99, 132, 1)',
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 2,
        fill: false,
      },
    ]
  };

  const chartOptions = {
    plugins: {
      title: {
        display: false,
      },
      legend: {
        position: 'bottom' as const,
        labels: {
          usePointStyle: true,
          boxWidth: 10,
          padding: 20
        }
      },
      tooltip: {
        callbacks: {
          title: (context: TooltipItem<"line">[]) => {
            const index = context[0].dataIndex;
            if (showByMonth) {
              return monthlyTrainingTypeData[index]?.month || '';
            } else {
              return trainingTypeData[index]?.week || '';
            }
          },
          label: (context: TooltipItem<"line">) => {
            const label = context.dataset.label || '';
            return `${label}: ${context.parsed.y}%`;
          }
        },
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        titleFont: {
          size: 14,
          weight: 'bold' as const
        }
      }
    },
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          callback: function(val: unknown, index: number) {
            if (showByMonth) {
              // Mode mensuel : afficher tous les mois
              const data = monthlyTrainingTypeData[index];
              if (data) {
                return data.month.split(' ')[0]; // Afficher seulement le nom du mois
              }
            } else {
              // Mode hebdomadaire : afficher uniquement les mois au début de chaque mois
              const data = trainingTypeData[index];
              if (data?.isFirstOfMonth) {
                return data.month;
              }
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
        beginAtZero: true,
        max: 110,
        stacked: false,
        title: {
          display: true,
          text: 'Pourcentage',
          color: '#666'
        },
        ticks: {
          callback: function(value: string | number) {
            // Convertir en nombre si c'est une chaîne
            const numValue = typeof value === 'string' ? parseFloat(value) : value;
            return numValue > 100 ? '' : numValue + '%';
          }
        },
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.05)',
        }
      }
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false
    }
  };

  if (isLoading) {
    return (
        <div className="bg-white shadow-md rounded-lg p-6 flex justify-center items-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
    );
  }

  if (error) {
    return (
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Types d&apos;entraînements</h2>
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded">
            {error}
          </div>
        </div>
    );
  }

  const hasData = showByMonth
      ? monthlyTrainingTypeData.length > 0
      : trainingTypeData.length > 0;

  if (!hasData) {
    return (
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Types d&apos;entraînements</h2>
          <div className="bg-blue-50 border border-blue-100 text-blue-700 p-8 rounded text-center">
            Aucune donnée disponible. Synchronisez vos activités Garmin pour voir la répartition des types d&apos;entraînement.
          </div>
        </div>
    );
  }

  return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col sm:flex-row justify-between gap-2 sm:items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Types d&apos;entraînements</h3>
          <DisplayModeToggle onChange={setShowByMonth} initialValue={showByMonth} />
        </div>
        <div className="h-64">
          <Line data={chartData} options={chartOptions} />
        </div>
        <div className="mt-4 text-sm text-gray-500">
          <p>Ce graphique montre la répartition entre les sorties trail (rouge) et les sorties de course sur route (bleu) par {showByMonth ? 'mois' : 'semaine'}.</p>
        </div>
      </div>
  );
}