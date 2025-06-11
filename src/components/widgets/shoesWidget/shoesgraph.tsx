'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useAuth } from '@/context/AuthContext';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TooltipItem,
} from 'chart.js';

// Enregistrer les composants Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface Shoe {
  id: string;
  name: string;
  description: string | null;
  manual_kilometers: number;
  auto_kilometers: number;
  total_kilometers: number;
  created_at: string;
  updated_at: string;
}

interface UsageDataPoint {
  date: string;
  cumulativeKm: number;
  dailyKm: number;
  type: 'manual' | 'auto';
  source: string; // nom de l'activité ou titre de l'ajout manuel
}

interface ShoesGraphProps {
  shoe: Shoe | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ShoesGraph({ shoe, isOpen, onClose }: ShoesGraphProps) {
  const [usageData, setUsageData] = useState<UsageDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showManualOnly, setShowManualOnly] = useState(false);
  const [showAutoOnly, setShowAutoOnly] = useState(false);
  
  const { user } = useAuth();
  const supabase = createClientComponentClient();

  // Gérer la fermeture du modal avec la touche Échap
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Charger les données d'utilisation de la chaussure
  const loadUsageData = useCallback(async () => {
    if (!shoe || !user) return;

    setIsLoading(true);
    setError('');

    try {
      // Récupérer les activités liées à cette chaussure
      const { data: activities, error: activitiesError } = await supabase
        .from('garmin_activities')
        .select('id, start_time, distance, activity_name, activity_type')
        .eq('user_id', user.id)
        .eq('shoes', shoe.id)
        .order('start_time', { ascending: true });

      if (activitiesError) throw activitiesError;

      // Récupérer les ajouts manuels de kilomètres
      const { data: manualEntries, error: manualError } = await supabase
        .from('manual_km')
        .select('id, kilometers, title, activity_date, created_at')
        .eq('user_id', user.id)
        .eq('shoe_id', shoe.id)
        .order('activity_date', { ascending: true });

      if (manualError) throw manualError;

      // Combiner et organiser toutes les données par date
      const allDataPoints: UsageDataPoint[] = [];

      // Ajouter les activités automatiques
      (activities || []).forEach(activity => {
        allDataPoints.push({
          date: activity.start_time.split('T')[0], // Extraire juste la date
          cumulativeKm: 0, // Sera calculé plus tard
          dailyKm: activity.distance / 1000, // Convertir de mètres en kilomètres
          type: 'auto',
          source: activity.activity_name || 'Activité'
        });
      });

      // Ajouter les ajouts manuels
      (manualEntries || []).forEach(entry => {
        allDataPoints.push({
          date: entry.activity_date,
          cumulativeKm: 0, // Sera calculé plus tard
          dailyKm: entry.kilometers,
          type: 'manual',
          source: entry.title
        });
      });

      // Trier par date
      allDataPoints.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Calculer les kilomètres cumulés
      let cumulativeKm = 0;
      const processedData = allDataPoints.map(point => {
        cumulativeKm += point.dailyKm;
        return {
          ...point,
          cumulativeKm
        };
      });

      setUsageData(processedData);
    } catch (err: unknown) {
      setError((err as Error).message || 'Erreur lors du chargement des données');
    } finally {
      setIsLoading(false);
    }
  }, [shoe, user, supabase]);

  useEffect(() => {
    if (isOpen && shoe) {
      loadUsageData();
    }
  }, [isOpen, shoe, loadUsageData]);

  // Filtrer les données selon les options sélectionnées
  const getFilteredData = useCallback(() => {
    let filteredData = usageData;

    if (showManualOnly) {
      filteredData = usageData.filter(point => point.type === 'manual');
    } else if (showAutoOnly) {
      filteredData = usageData.filter(point => point.type === 'auto');
    }

    // Recalculer les kilomètres cumulés pour les données filtrées
    let cumulativeKm = 0;
    return filteredData.map(point => {
      cumulativeKm += point.dailyKm;
      return {
        ...point,
        cumulativeKm
      };
    });
  }, [usageData, showManualOnly, showAutoOnly]);
  const filteredData = getFilteredData();
  // Organiser les données par mois
  const dataByMonth = new Map<string, { manual: number; auto: number; manualSources: string[]; autoSources: string[] }>();
  
  filteredData.forEach(point => {
    const dateObj = new Date(point.date);
    const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
    
    if (!dataByMonth.has(monthKey)) {
      dataByMonth.set(monthKey, { manual: 0, auto: 0, manualSources: [], autoSources: [] });
    }
    
    const monthData = dataByMonth.get(monthKey)!;
    if (point.type === 'manual') {
      monthData.manual += point.dailyKm;
      monthData.manualSources.push(point.source);
    } else {
      monthData.auto += point.dailyKm;
      monthData.autoSources.push(point.source);
    }
  });

  // Créer la plage de mois (du premier mois d'activité au mois actuel)
  const currentDate = new Date();
  const currentMonthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  
  let firstMonthKey = currentMonthKey;
  if (dataByMonth.size > 0) {
    const sortedMonths = Array.from(dataByMonth.keys()).sort();
    firstMonthKey = sortedMonths[0];
  }

  // Générer tous les mois entre le premier et le mois actuel
  const allMonths: string[] = [];
  const startDate = new Date(`${firstMonthKey}-01`);
  const endDate = new Date(`${currentMonthKey}-01`);
  
  for (let d = new Date(startDate); d <= endDate; d.setMonth(d.getMonth() + 1)) {
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    allMonths.push(monthKey);
  }

  // Créer les labels et les données pour les datasets
  const labels = allMonths.map(monthKey => {
    const [year, month] = monthKey.split('-');
    const dateObj = new Date(parseInt(year), parseInt(month) - 1);
    return dateObj.toLocaleDateString('fr-FR', { 
      month: '2-digit',
      year: '2-digit'
    });
  });

  const manualData = allMonths.map(monthKey => dataByMonth.get(monthKey)?.manual || 0);
  const autoData = allMonths.map(monthKey => dataByMonth.get(monthKey)?.auto || 0);
  const emptyMonthData = allMonths.map(monthKey => 
    (dataByMonth.get(monthKey)?.manual || 0) === 0 && (dataByMonth.get(monthKey)?.auto || 0) === 0 ? 10 : 0
  );
  // Configuration du graphique avec trois datasets
  const chartData = {
    labels,
    datasets: [
      {
        label: 'Manuel',
        data: manualData,
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: 1,
        borderRadius: 4,
        borderSkipped: false,
      },
      {
        label: 'Automatique',
        data: autoData,
        backgroundColor: 'rgba(147, 51, 234, 0.8)',
        borderColor: 'rgb(147, 51, 234)',
        borderWidth: 1,
        borderRadius: 4,
        borderSkipped: false,
      },
      {
        label: 'Mois vide',
        data: emptyMonthData,
        backgroundColor: 'rgba(156, 163, 175, 0.4)',
        borderColor: 'rgb(156, 163, 175)',
        borderWidth: 2,
        borderDash: [5, 5],
        borderRadius: 4,
        borderSkipped: false,
      },
    ],
  };const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          pointStyle: 'rect',
          padding: 20,
          font: {
            size: 12,
          },
        },
      },
      title: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1,
        cornerRadius: 6,
        caretPadding: 10,        callbacks: {
          title: function(context: TooltipItem<'bar'>[]) {
            const index = context[0].dataIndex;
            const monthKey = allMonths[index];
            if (monthKey) {
              const [year, month] = monthKey.split('-');
              const dateObj = new Date(parseInt(year), parseInt(month) - 1);
              return dateObj.toLocaleDateString('fr-FR', { 
                month: 'long',
                year: 'numeric'
              });
            }
            return '';
          },          label: function(context: TooltipItem<'bar'>) {
            const index = context.dataIndex;
            const monthKey = allMonths[index];
            const monthData = dataByMonth.get(monthKey);
            const datasetLabel = context.dataset.label;
            
            if (datasetLabel === 'Mois vide') {
              return []; // Pas de tooltip pour les mois vides
            }
            
            if (monthData && datasetLabel) {
              const lines = [];
              
              if (datasetLabel === 'Manuel' && monthData.manual > 0) {
                lines.push(`Manuel: ${monthData.manual.toFixed(1)} km`);
                if (monthData.manualSources.length > 0) {
                  const uniqueSources = [...new Set(monthData.manualSources)];
                  lines.push(`Sources: ${uniqueSources.join(', ')}`);
                }
              } else if (datasetLabel === 'Automatique' && monthData.auto > 0) {
                lines.push(`Automatique: ${monthData.auto.toFixed(1)} km`);
                if (monthData.autoSources.length > 0) {
                  const uniqueSources = [...new Set(monthData.autoSources)];
                  lines.push(`Sources: ${uniqueSources.join(', ')}`);
                }
              }
              
              return lines;
            }
            return '';
          },
          footer: function(context: TooltipItem<'bar'>[]) {
            const index = context[0].dataIndex;
            const monthKey = allMonths[index];
            const monthData = dataByMonth.get(monthKey);
            if (monthData) {
              const total = monthData.manual + monthData.auto;
              return `Total: ${total.toFixed(1)} km`;
            }
            return '';
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Date',
          font: { size: 12, weight: 'bold' as const },
          color: '#374151'
        },
        grid: {
          display: false
        },
        ticks: {
          maxTicksLimit: 8,
          font: { size: 11 }
        },
        stacked: true,
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Kilomètres ajoutés',
          font: { size: 12, weight: 'bold' as const },
          color: '#374151'
        },
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.1)'
        },
        beginAtZero: true,
        stacked: true,
        ticks: {
          callback: function(value: string | number) {
            const numValue = typeof value === 'string' ? parseFloat(value) : value;
            return `${numValue.toFixed(1)} km`;
          }
        }
      }
    }
  };

  const formatKilometers = (km: number) => {
    return km % 1 === 0 ? km.toString() : km.toFixed(1);
  };

  if (!isOpen || !shoe) return null;

  return (
    <>
      {/* Arrière-plan flou */}
      <div 
        className="fixed inset-0 z-[60] bg-black/20 backdrop-blur-md transition-all duration-300 w-screen h-screen" 
        onClick={onClose}
      />
      
      {/* Contenu du modal */}
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 pointer-events-none w-screen h-screen">
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300 pointer-events-auto">
          
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Graphique d&apos;utilisation
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {shoe.name} • Total: {formatKilometers(shoe.total_kilometers)} km
              </p>
            </div>
            
            {/* Bouton de fermeture */}
            <button
              type="button"
              onClick={onClose}
              className="flex items-center justify-center w-10 h-10 bg-white hover:bg-gray-50 rounded-full shadow-md transition-all duration-200 hover:scale-105"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Corps du modal */}
          <div className="p-6">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">{error}</span>
                </div>
              </div>
            )}

            {/* Contrôles de filtrage */}
            <div className="mb-6 flex flex-wrap items-center gap-4">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => {
                    setShowManualOnly(false);
                    setShowAutoOnly(false);
                  }}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    !showManualOnly && !showAutoOnly
                      ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Tout afficher
                </button>
                
                <button
                  onClick={() => {
                    setShowManualOnly(true);
                    setShowAutoOnly(false);
                  }}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    showManualOnly
                      ? 'bg-green-100 text-green-800 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  📝 Manuel uniquement
                </button>
                
                <button
                  onClick={() => {
                    setShowManualOnly(false);
                    setShowAutoOnly(true);
                  }}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    showAutoOnly
                      ? 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  🔗 Automatique uniquement
                </button>
              </div>
              
              {/* Statistiques rapides */}
              <div className="flex items-center space-x-6 text-sm">
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                  <span className="text-gray-600">Manuel: {formatKilometers(shoe.manual_kilometers)} km</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 bg-purple-500 rounded-full"></span>
                  <span className="text-gray-600">Auto: {formatKilometers(shoe.auto_kilometers)} km</span>
                </div>
              </div>
            </div>

            {/* Graphique */}
            {isLoading ? (
              <div className="flex justify-center items-center h-96">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  <p className="text-gray-600">Chargement des données...</p>
                </div>
              </div>
            ) : dataByMonth.size === 0 ? (
              <div className="flex justify-center items-center h-96">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune donnée</h3>
                  <p className="text-gray-500 max-w-md mx-auto">
                    {showManualOnly && 'Aucun kilomètre manuel enregistré pour cette chaussure.'}
                    {showAutoOnly && 'Aucune activité automatique liée à cette chaussure.'}
                    {!showManualOnly && !showAutoOnly && 'Aucune donnée d\'utilisation trouvée pour cette chaussure.'}
                  </p>
                </div>
              </div>            ) : (
              <div className="h-96 bg-gray-50 rounded-lg p-4">
                <Bar data={chartData} options={chartOptions} />
              </div>
            )}            {/* Résumé des données */}
            {dataByMonth.size > 0 && (
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    <span className="text-sm font-medium text-blue-800">Total période</span>
                  </div>                  <span className="text-2xl font-bold text-blue-600">
                    {formatKilometers(Array.from(dataByMonth.values()).reduce((sum, month) => sum + month.manual + month.auto, 0))} km
                  </span>
                </div>
                
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm font-medium text-purple-800">Période</span>
                  </div>                  <span className="text-sm font-medium text-purple-600">
                    {allMonths.length > 0 && (
                      <>
                        {new Date(`${allMonths[0]}-01`).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
                        {allMonths.length > 1 && (
                          <> - {new Date(`${allMonths[allMonths.length - 1]}-01`).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}</>
                        )}
                      </>
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 text-center">
            <div className="flex items-center justify-center text-sm text-gray-500">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Graphique des utilisations de la chaussure • Chaque barre représente les kilomètres ajoutés par mois</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
