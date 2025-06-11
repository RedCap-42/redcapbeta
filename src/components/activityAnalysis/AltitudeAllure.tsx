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
  Filler, // Added Filler
  ChartEvent,
} from 'chart.js';
import FitParser from 'fit-file-parser';

// Enregistrer les composants Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler // Added Filler
);

type Activity = {
  id: string;
  activity_id: number;
  start_time: string;
  name: string;
  distance: number;
  duration: number;
  sport_type: string;
  elevation_gain?: number | null;
  fit_file_path?: string;
};

interface PaceDataPoint {
  distance: number; // en km
  pace: number; // en secondes par km
  speed: number; // en m/s pour faciliter les calculs
}

interface AltitudeDataPoint {
  distance: number; // en km
  altitude: number; // en mètres
}

interface FitRecord {
  speed?: number;
  distance?: number;
  timestamp?: Date;
  enhanced_speed?: number;
  enhanced_distance?: number;
  altitude?: number;
  enhanced_altitude?: number;
  [key: string]: unknown;
}

interface FitData {
  records?: FitRecord[];
  sessions?: Array<{ [key: string]: unknown }>;
  [key: string]: unknown;
}

type AltitudeAllureProps = {
  activity: Activity;
};

export default function AltitudeAllure({ activity }: AltitudeAllureProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paceData, setPaceData] = useState<PaceDataPoint[]>([]);
  const [altitudeData, setAltitudeData] = useState<AltitudeDataPoint[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showAltitude, setShowAltitude] = useState(false);
  const [zoomPosition, setZoomPosition] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(100);
  const { user } = useAuth();
  const supabase = createClientComponentClient();

  // Fonction pour formater les secondes en min:sec
  const formatPaceFromSeconds = (paceInSeconds: number): string => {
    const minutes = Math.floor(paceInSeconds / 60);
    const seconds = Math.floor(paceInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Fonction pour calculer les données filtrées selon le zoom
  const getFilteredData = () => {
    if (paceData.length === 0) return { labels: [], paceData: [], altitudeData: [] };
    
    const totalPoints = paceData.length;
    const visiblePoints = Math.floor((totalPoints * zoomLevel) / 100);
    const startIndex = Math.floor((totalPoints - visiblePoints) * (zoomPosition / 100));
    const endIndex = startIndex + visiblePoints;
    
    const filteredPaceData = paceData.slice(startIndex, endIndex);
    const filteredAltitudeData = altitudeData.slice(startIndex, endIndex);
    
    return {
      labels: filteredPaceData.map(point => point.distance.toFixed(1)),
      paceData: filteredPaceData.map(point => point.pace / 60),
      altitudeData: filteredAltitudeData.map(point => point.altitude)
    };
  };

  // Gérer le reset du zoom quand le modal s'ouvre
  useEffect(() => {
    if (isModalOpen) {
      setZoomPosition(0);
      setZoomLevel(100);
    }
  }, [isModalOpen]);

  // Fonction pour charger et analyser le fichier FIT
  const loadFitFileData = useCallback(async () => {
    if (!user) {
      setError('Utilisateur non connecté');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log(`Activité: ${activity.name}, ID: ${activity.activity_id}`);
      console.log(`Tentative de téléchargement du fichier FIT avec chemin: ${activity.fit_file_path}`);

      // Essayer plusieurs chemins possibles dans l'ordre de priorité
      const pathsToTry = [
        activity.fit_file_path ? activity.fit_file_path : null,
        `${user.id}/fitFiles/${activity.activity_id}.fit`,
        `${user.id}/${activity.activity_id}.fit`,
        `${user.id}/files/${activity.activity_id}.fit`,
        `${user.id}/activities/${activity.activity_id}.fit`,
      ].filter(Boolean);

      console.log(`Tentative avec ${pathsToTry.length} chemins possibles:`, pathsToTry);

      let fitData: Blob | null = null;
      let usedPath: string | null = null;
      const allErrors: string[] = [];

      // Essayer chaque chemin jusqu'à ce qu'un fonctionne
      for (const path of pathsToTry) {
        if (!path) continue;

        console.log(`Essai avec le chemin: ${path}`);
        const { data, error: downloadError } = await supabase
          .storage
          .from('database')
          .download(path);

        if (!downloadError && data) {
          fitData = data;
          usedPath = path;
          console.log(`Fichier FIT trouvé avec le chemin: ${path}`);
          break;
        } else {
          console.log(`Échec avec le chemin ${path}:`, downloadError?.message);
          allErrors.push(`${path}: ${downloadError?.message}`);
        }
      }

      // Si aucun chemin n'a fonctionné
      if (!fitData) {
        console.error('Tous les chemins ont échoué:', allErrors);
        setError(`Impossible de télécharger le fichier FIT après ${pathsToTry.length} tentatives.`);
        return;
      }

      console.log(`Analyse du fichier FIT récupéré via le chemin: ${usedPath}`);

      // Convertir le blob en ArrayBuffer
      const arrayBuffer = await fitData.arrayBuffer();

      // Parser le fichier FIT
      const fitParser = new FitParser({
        force: true,
        speedUnit: 'm/s',
        lengthUnit: 'm',
        elapsedRecordField: true,
        mode: 'list',
      });

      // Utiliser un cast de type pour indiquer à TypeScript que parse peut accepter un callback
      (fitParser.parse as (content: ArrayBuffer, callback: (err: Error, data: FitData) => void) => void)(
        arrayBuffer,
        (parseError: Error, data: FitData) => {
          if (parseError) {
            console.error('Erreur lors du parsing du fichier FIT:', parseError);
            setError('Erreur lors de l\'analyse du fichier FIT');
            setLoading(false);
            return;
          }

          try {
            console.log('Données FIT reçues:', Object.keys(data));
            
            // Extraire les données de records pour calculer l'allure et l'altitude
            const pacePoints: PaceDataPoint[] = [];
            const altitudePoints: AltitudeDataPoint[] = [];
            let lastDistance = 0;
            let lastTimestamp: Date | null = null;

            if (data.records && Array.isArray(data.records)) {
              console.log(`Nombre de records trouvés: ${data.records.length}`);
              
              data.records.forEach((record: FitRecord, index: number) => {
                // Priorité aux données enhanced, sinon utiliser les données standard
                const speed = record.enhanced_speed || record.speed;
                const distance = record.enhanced_distance || record.distance;
                const altitude = record.enhanced_altitude || record.altitude;
                const timestamp = record.timestamp;

                // Méthode 1: Utiliser la distance cumulée si disponible
                if (distance !== undefined && distance > 0) {
                  const distanceInKm = distance / 1000;
                  
                  // Calculer l'allure basée sur la vitesse instantanée
                  if (speed !== undefined && speed > 0) {
                    const paceInSecondsPerKm = 1000 / speed;
                    
                    // Filtrer les valeurs aberrantes (allure trop lente ou trop rapide)
                    if (paceInSecondsPerKm > 0 && paceInSecondsPerKm < 1800) { // Entre 0 et 30 min/km
                      pacePoints.push({
                        distance: distanceInKm,
                        pace: paceInSecondsPerKm,
                        speed: speed
                      });
                    }
                  }

                  // Ajouter les données d'altitude si disponibles
                  if (altitude !== undefined) {
                    altitudePoints.push({
                      distance: distanceInKm,
                      altitude: altitude
                    });
                  }
                  
                  lastDistance = distance;
                } 
                // Méthode 2: Utiliser la vitesse pour estimer la distance
                else if (speed !== undefined && speed > 0 && index > 0) {
                  // Estimer l'intervalle de temps (généralement 1 seconde)
                  let timeInterval = 1; // Par défaut 1 seconde
                  
                  if (timestamp && lastTimestamp) {
                    timeInterval = (timestamp.getTime() - lastTimestamp.getTime()) / 1000;
                  }
                  
                  // Calculer la distance parcourue dans cet intervalle
                  const distanceDelta = speed * timeInterval;
                  lastDistance += distanceDelta;
                  
                  const distanceInKm = lastDistance / 1000;
                  const paceInSecondsPerKm = 1000 / speed;
                  
                  // Filtrer les valeurs aberrantes
                  if (paceInSecondsPerKm > 0 && paceInSecondsPerKm < 1800) {
                    pacePoints.push({
                      distance: distanceInKm,
                      pace: paceInSecondsPerKm,
                      speed: speed
                    });
                  }

                  // Ajouter les données d'altitude si disponibles
                  if (altitude !== undefined) {
                    altitudePoints.push({
                      distance: distanceInKm,
                      altitude: altitude
                    });
                  }
                }
                
                if (timestamp) {
                  lastTimestamp = timestamp;
                }
              });
            }

            console.log(`Points d'allure extraits: ${pacePoints.length}`);
            console.log(`Points d'altitude extraits: ${altitudePoints.length}`);
            setPaceData(pacePoints);
            setAltitudeData(altitudePoints);
            setLoading(false);
          } catch (err) {
            console.error('Erreur lors de l\'extraction des données:', err);
            setError('Erreur lors du traitement des données');
            setLoading(false);
          }
        }
      );
    } catch (err) {
      console.error('Erreur:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      setLoading(false);
    }
  }, [user, activity, supabase]);

  useEffect(() => {
    if (!user) {
      return;
    }
    loadFitFileData();
  }, [activity, user, loadFitFileData]);

  // Gérer la fermeture du modal avec la touche Échap
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isModalOpen) {
        setIsModalOpen(false);
      }
    };

    if (isModalOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen]);

  // Configuration du graphique avec double axe Y
  const chartData = {
    labels: paceData.map(point => point.distance.toFixed(1)),
    datasets: [
      {
        label: 'Allure (min/km)',
        data: paceData.map(point => point.pace / 60),
        borderColor: 'rgb(79, 70, 229)',
        backgroundColor: 'rgba(79, 70, 229, 0.1)',
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 8,
        pointHitRadius: 15,
        pointHoverBackgroundColor: 'rgb(79, 70, 229)',
        pointHoverBorderColor: 'white',
        pointHoverBorderWidth: 2,
        tension: 0,
        yAxisID: 'y',
        fill: false,
      },      ...(showAltitude && altitudeData.length > 0 ? [{
        label: 'Altitude (m)',
        data: altitudeData.map(point => point.altitude),
        borderColor: 'rgb(16, 185, 129)', // Emerald-500
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.2,
        yAxisID: 'y1',
        fill: 'start',
      }] : [])
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    onClick: (event: ChartEvent) => {
      if (event.native) {
        event.native.preventDefault();
        event.native.stopPropagation();
      }
      setIsModalOpen(true);
    },    plugins: {
      legend: {
        display: showAltitude && altitudeData.length > 0,
        position: 'top' as const,
        onClick: () => {}, // Désactiver le clic sur la légende
      },
      title: {
        display: false,
      },
      tooltip: {
        intersect: false,
        mode: 'index' as const,
        displayColors: true,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgb(79, 70, 229)',
        borderWidth: 1,
        cornerRadius: 6,
        caretPadding: 10,        callbacks: {
          label: function(context: { datasetIndex: number; parsed: { y: number } }) {
            if (context.datasetIndex === 0) {
              const paceInMinutes = context.parsed.y;
              return `Allure: ${formatPaceFromSeconds(paceInMinutes * 60)}/km`;
            } else if (context.datasetIndex === 1) {
              return `Altitude: ${context.parsed.y.toFixed(0)}m`;
            }
            return '';
          },
          title: function(context: Array<{ label: string }>) {
            return `Distance: ${context[0].label} km`;
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Distance (km)'
        },
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.1)'
        }
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Allure (min/km)'
        },
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          callback: function(value: string | number) {
            const numValue = typeof value === 'string' ? parseFloat(value) : value;
            return formatPaceFromSeconds(numValue * 60);
          }
        },
        reverse: true
      },
      ...(showAltitude && altitudeData.length > 0 ? {
        y1: {
          type: 'linear' as const,
          display: true,
          position: 'right' as const,
          title: {
            display: true,
            text: 'Altitude (m)'
          },
          grid: {
            drawOnChartArea: false,
          },
          ticks: {
            callback: function(value: string | number) {
              const numValue = typeof value === 'string' ? parseFloat(value) : value;
              return `${numValue.toFixed(0)}m`;
            }
          }
        }
      } : {})
    },
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto"></div>
        <p className="text-sm text-gray-600 mt-2">Chargement des données d&apos;allure et d&apos;altitude...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-semibold text-gray-800">Analyse de l&apos;Allure avec Profil d&apos;Altitude</h4>
        
        {/* Bouton pour activer/désactiver l'affichage de l'altitude */}        {altitudeData.length > 0 && (
          <button
            onClick={() => setShowAltitude(!showAltitude)}
            className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              showAltitude
                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <svg 
              className={`w-4 h-4 mr-2 transition-colors ${showAltitude ? 'text-emerald-600' : 'text-gray-500'}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" 
              />
            </svg>
            {showAltitude ? 'Masquer l\'altitude' : 'Afficher l\'altitude'}
          </button>
        )}
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div>
              <h5 className="text-sm font-medium text-red-800">Erreur de chargement</h5>
              <p className="text-xs text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {paceData.length > 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="h-64">
            <Line data={chartData} options={chartOptions} />
          </div>
          <div className="mt-4 text-xs text-gray-500 text-center space-y-1">
            <div>Graphique d&apos;allure • {paceData.length} points de données • Cliquez pour agrandir</div>
            {altitudeData.length > 0 && (
              <div>Données d&apos;altitude disponibles • {altitudeData.length} points d&apos;élévation</div>
            )}
          </div>
        </div>
      ) : !loading && !error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <h5 className="text-sm font-medium text-yellow-800">Données d&apos;allure non disponibles</h5>
              <p className="text-xs text-yellow-700 mt-1">
                {activity.fit_file_path 
                  ? "Les données détaillées d'allure n'ont pas pu être extraites du fichier FIT."
                  : "Aucun fichier FIT n'est associé à cette activité."
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Overlay Modal pour afficher le graphique en grand */}
      {isModalOpen && (
        <>
          {/* Arrière-plan flou qui couvre toute la page analyse */}
          <div className="fixed inset-0 z-[60] bg-black/20 backdrop-blur-md transition-all duration-300">
            <div 
              className="absolute inset-0"
              onClick={() => setIsModalOpen(false)}
            />
          </div>
          
          {/* Contenu du modal centré */}
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-6">
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300">
              {/* Header du modal */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Analyse détaillée de l&apos;allure {showAltitude ? 'et altitude' : ''}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {activity.name} • {paceData.length} points de données
                    {altitudeData.length > 0 && ` • ${altitudeData.length} points d'altitude`}
                  </p>
                </div>
                
                {/* Bouton de fermeture */}
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="flex items-center justify-center w-10 h-10 bg-white hover:bg-gray-50 rounded-full shadow-md transition-all duration-200 hover:scale-105"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Corps du modal avec le graphique */}
              <div className="p-6">
                {/* Contrôles en haut */}
                <div className="mb-4 flex items-center justify-between">
                  {/* Bouton altitude pour le modal */}
                  {altitudeData.length > 0 && (
                    <button
                      onClick={() => setShowAltitude(!showAltitude)}                    className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      showAltitude
                        ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <svg 
                      className={`w-4 h-4 mr-2 transition-colors ${showAltitude ? 'text-emerald-600' : 'text-gray-500'}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" 
                        />
                      </svg>
                      {showAltitude ? 'Masquer l\'altitude' : 'Afficher l\'altitude'}
                    </button>
                  )}
                </div>

                {/* Contrôles de zoom */}
                <div className="mb-4 space-y-4">
                  {/* Curseur de niveau de zoom */}
                  <div className="flex items-center space-x-4">
                    <label className="text-sm font-medium text-gray-700 min-w-[100px]">
                      Niveau de zoom:
                    </label>
                    <div className="flex-1">                      <input
                        type="range"
                        min="20"
                        max="100"
                        value={zoomLevel}
                        onChange={(e) => setZoomLevel(Number(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer hover:bg-gray-300 transition-colors duration-200"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Zoom max</span>
                        <span>{zoomLevel}%</span>
                        <span>Vue complète</span>
                      </div>
                    </div>
                  </div>

                  {/* Curseur de position de zoom */}
                  {zoomLevel < 100 && (
                    <div className="flex items-center space-x-4">
                      <label className="text-sm font-medium text-gray-700 min-w-[100px]">
                        Position:
                      </label>
                      <div className="flex-1">                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={zoomPosition}
                          onChange={(e) => setZoomPosition(Number(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer hover:bg-gray-300 transition-colors duration-200"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>Début</span>
                          <span>{zoomPosition}%</span>
                          <span>Fin</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Graphique en grand format */}
                <div className="h-[500px] mb-6 bg-gray-50 rounded-lg p-4">
                  <Line data={{
                    labels: getFilteredData().labels,
                    datasets: [
                      {
                        ...chartData.datasets[0],
                        data: getFilteredData().paceData
                      },
                      ...(showAltitude && altitudeData.length > 0 ? [{
                        ...chartData.datasets[1],
                        data: getFilteredData().altitudeData
                      }] : [])
                    ]
                  }} options={{
                    ...chartOptions,
                    onClick: undefined, // Désactiver le clic dans le modal
                    maintainAspectRatio: false,
                    responsive: true,
                    plugins: {
                      ...chartOptions.plugins,                      legend: {
                        display: showAltitude && altitudeData.length > 0,
                        position: 'top' as const,
                        onClick: () => {}, // Désactiver le clic sur la légende
                        labels: {
                          font: { size: 14 },
                          padding: 20
                        }
                      },
                      tooltip: {
                        ...chartOptions.plugins.tooltip,
                        titleFont: { size: 16 },
                        bodyFont: { size: 14 },
                        padding: 12,
                      }
                    },
                    scales: {
                      ...chartOptions.scales,
                      x: {
                        ...chartOptions.scales?.x,
                        title: {
                          display: true,
                          text: 'Distance (km)',
                          font: { size: 14, weight: 'bold' },
                          color: '#374151'
                        }
                      },
                      y: {
                        ...chartOptions.scales?.y,
                        title: {
                          display: true,
                          text: 'Allure (min/km)',
                          font: { size: 14, weight: 'bold' },
                          color: '#374151'
                        }
                      },
                      ...(showAltitude && altitudeData.length > 0 && chartOptions.scales?.y1 ? {
                        y1: {
                          ...chartOptions.scales.y1,
                          title: {
                            display: true,
                            text: 'Altitude (m)',                            font: { size: 14, weight: 'bold' },
                            color: '#10b981' // Emerald-500
                          }
                        }
                      } : {})
                    }
                  }} />
                </div>
              </div>
              
              {/* Footer avec instructions */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 text-center">
                <div className="flex items-center justify-center text-sm text-gray-500">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Appuyez sur <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-mono">Échap</kbd> ou cliquez à l&apos;extérieur pour fermer</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}