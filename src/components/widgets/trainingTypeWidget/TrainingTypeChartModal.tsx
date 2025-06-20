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

interface TrainingTypeChartModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TrainingTypeChartModal({ isOpen, onClose }: TrainingTypeChartModalProps) {
  const [trainingTypeData, setTrainingTypeData] = useState<TrainingTypeData[]>([]);
  const [monthlyTrainingTypeData, setMonthlyTrainingTypeData] = useState<MonthlyTrainingTypeData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showByMonth, setShowByMonth] = useState<boolean>(false);
  const supabase = createClientComponentClient();

  // Obtenir le début de la semaine (lundi) pour une date donnée
  const getWeekStart = (date: Date) => {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
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

  // Ajouter les informations de mois aux données
  const addMonthInfo = useCallback((data: TrainingTypeData[]): TrainingTypeData[] => {
    if (data.length === 0) return [];

    const result = data.map(item => ({
      ...item,
      isFirstOfMonth: false,
      month: ''
    }));

    const firstWeekStr = data[0].week;
    const lastWeekStr = data[data.length - 1].week;

    const currentYear = new Date().getFullYear();
    const months = ['janv', 'févr', 'mars', 'avr', 'mai', 'juin', 'juil', 'août', 'sept', 'oct', 'nov', 'déc'];

    const firstMonthStr = firstWeekStr.split(' ')[1].toLowerCase();
    const firstMonthIndex = months.findIndex(m => firstMonthStr.startsWith(m));
    const firstMonth = firstMonthIndex === -1 ? 0 : firstMonthIndex;

    const lastMonthStr = lastWeekStr.split(' ')[1].toLowerCase();
    const lastMonthIndex = months.findIndex(m => lastMonthStr.startsWith(m));
    const lastMonth = lastMonthIndex === -1 ? 11 : lastMonthIndex;

    let totalMonths = (lastMonth >= firstMonth) ?
        (lastMonth - firstMonth + 1) :
        (12 - firstMonth + lastMonth + 1);

    if (totalMonths === 0) totalMonths = 1;

    const sectionSize = data.length / totalMonths;

    for (let i = 0; i < totalMonths; i++) {
      let index = Math.floor(i * sectionSize);
      index = Math.min(index, data.length - 1);

      const monthIndex = (firstMonth + i) % 12;
      const monthName = getMonthName(new Date(currentYear, monthIndex));

      result[index].isFirstOfMonth = true;
      result[index].month = monthName;
    }

    return result;
  }, []);

  // Fonction pour récupérer toutes les données historiques
  const fetchAllTrainingTypeData = useCallback(async () => {
    if (!isOpen) return;

    try {
      setIsLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Utilisateur non connecté');
      }

      // Récupérer TOUTES les activités de l'utilisateur
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
        return;
      }

      // Organiser les activités par semaine et par mois
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

      const dataWithMonths = addMonthInfo(processedWeeklyData);

      setTrainingTypeData(dataWithMonths);
      setMonthlyTrainingTypeData(processedMonthlyData);
    } catch (err) {
      console.error('Erreur lors de la récupération des données de type d\'entraînement:', err);
      setError('Impossible de charger les données de type d\'entraînement');
    } finally {
      setIsLoading(false);
    }
  }, [isOpen, supabase, addMonthInfo]);

  useEffect(() => {
    fetchAllTrainingTypeData();
  }, [fetchAllTrainingTypeData]);

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
      }
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
              const data = monthlyTrainingTypeData[index];
              if (data) {
                return data.month.split(' ')[0];
              }
            } else {
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
  };  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* En-tête de la modal */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Types d&apos;entraînements historiques</h2>
            <p className="text-sm text-gray-600">Toutes vos activités depuis le début</p>
          </div>
          <div className="flex items-center gap-4">
            <DisplayModeToggle onChange={setShowByMonth} initialValue={showByMonth} />
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
          ) : (
            <>
              <div className="h-96 mb-4">
                <Line data={chartData} options={chartOptions} />
              </div>
              
              {/* Statistiques */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {showByMonth ? monthlyTrainingTypeData.length : trainingTypeData.length}
                  </div>
                  <div className="text-sm text-gray-600">{showByMonth ? 'mois' : 'semaines'}</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {showByMonth ? 
                      monthlyTrainingTypeData.length > 0 ? 
                        Math.round(monthlyTrainingTypeData.reduce((sum, data) => sum + data.roadPercentage, 0) / monthlyTrainingTypeData.length) : 0 :
                      trainingTypeData.length > 0 ? 
                        Math.round(trainingTypeData.reduce((sum, data) => sum + data.roadPercentage, 0) / trainingTypeData.length) : 0
                    }%
                  </div>
                  <div className="text-sm text-gray-600">Route moyenne</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {showByMonth ? 
                      monthlyTrainingTypeData.length > 0 ? 
                        Math.round(monthlyTrainingTypeData.reduce((sum, data) => sum + data.trailPercentage, 0) / monthlyTrainingTypeData.length) : 0 :
                      trainingTypeData.length > 0 ? 
                        Math.round(trainingTypeData.reduce((sum, data) => sum + data.trailPercentage, 0) / trainingTypeData.length) : 0
                    }%
                  </div>
                  <div className="text-sm text-gray-600">Trail moyenne</div>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {new Date().getFullYear()}
                  </div>
                  <div className="text-sm text-gray-600">Année actuelle</div>
                </div>
              </div>

              {/* Description */}
              <div className="mt-6 text-sm text-gray-500">
                <p>Ce graphique montre la répartition entre les sorties trail (rouge) et les sorties de course sur route (bleu) par {showByMonth ? 'mois' : 'semaine'}.</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
