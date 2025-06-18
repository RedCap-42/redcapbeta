'use client';

import { useState, useEffect, useCallback } from 'react';
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
  Filler,
  ChartEvent,
} from 'chart.js';
import { useAuth } from '@/context/AuthContext';
import ChartControls from './ChartControls';
import { FitFileProcessor } from './FitFileProcessor';
import { createChartData, createChartOptions } from './ChartConfiguration';

// Enregistrer les composants Chart.js
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

// Types locaux
interface PaceDataPoint {
  distance: number;
  pace: number;
  speed: number;
}

interface AltitudeDataPoint {
  distance: number;
  altitude: number;
}

interface HeartRateDataPoint {
  distance: number;
  heartRate: number;
}

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

interface AltitudeAllureProps {
  activity: Activity;
}

export default function AltitudeAllure({ activity }: AltitudeAllureProps) {
  // États
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);  const [paceData, setPaceData] = useState<PaceDataPoint[]>([]);
  const [altitudeData, setAltitudeData] = useState<AltitudeDataPoint[]>([]);
  const [heartRateData, setHeartRateData] = useState<HeartRateDataPoint[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showAltitude, setShowAltitude] = useState(false);
  const [showHeartRate, setShowHeartRate] = useState(false);
    const { user } = useAuth();

  // Chargement des données FIT
  const loadFitFileData = useCallback(async () => {
    if (!user) {
      setError('Utilisateur non connecté');
      return;
    }

    setLoading(true);
    setError(null);

    try {      const fitFileProcessor = new FitFileProcessor();
      const fitData = await fitFileProcessor.loadFitFileData(user, {
        activity_id: activity.activity_id,
        fit_file_path: activity.fit_file_path,
        name: activity.name
      });
      setPaceData(fitData.paceData);
      setAltitudeData(fitData.altitudeData);
      setHeartRateData(fitData.heartRateData);
        // Debug des données extraites
      console.log('🔍 DEBUG AltitudeAllure - Données extraites du FitFileProcessor:');
      console.log('Activité distance totale:', activity.distance, 'mètres');
      console.log('Points d\'allure:', fitData.paceData.length);
      console.log('Points d\'altitude:', fitData.altitudeData.length);
      console.log('Points de FC:', fitData.heartRateData.length);
      
      if (fitData.paceData.length > 0) {
        const distances = fitData.paceData.map(p => p.distance);
        const minDist = Math.min(...distances);
        const maxDist = Math.max(...distances);
        console.log('✅ FitFileProcessor - Distance min:', minDist.toFixed(3), 'km');
        console.log('✅ FitFileProcessor - Distance max:', maxDist.toFixed(3), 'km');
        console.log('✅ FitFileProcessor - Premiers 5 points d\'allure:', fitData.paceData.slice(0, 5));
        console.log('✅ FitFileProcessor - Derniers 5 points d\'allure:', fitData.paceData.slice(-5));
      } else {
        console.error('❌ FitFileProcessor n\'a extrait AUCUN point d\'allure !');
      }
      
      if (fitData.altitudeData.length > 0) {
        const distances = fitData.altitudeData.map(p => p.distance);
        const minDist = Math.min(...distances);
        const maxDist = Math.max(...distances);
        console.log('✅ FitFileProcessor - Altitude Distance min:', minDist.toFixed(3), 'km');
        console.log('✅ FitFileProcessor - Altitude Distance max:', maxDist.toFixed(3), 'km');
        console.log('✅ FitFileProcessor - Premiers 5 points d\'altitude:', fitData.altitudeData.slice(0, 5));
        console.log('✅ FitFileProcessor - Derniers 5 points d\'altitude:', fitData.altitudeData.slice(-5));
      } else {
        console.error('❌ FitFileProcessor n\'a extrait AUCUN point d\'altitude !');
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Erreur:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      setLoading(false);
    }
  }, [user, activity]);

  useEffect(() => {
    if (!user) return;
    loadFitFileData();
  }, [activity, user, loadFitFileData]);

  // Gestion du modal avec échap
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

  // Configuration des données et options du graphique
  const chartData = createChartData(paceData, altitudeData, heartRateData, showAltitude, showHeartRate);  const chartOptions = createChartOptions(
    showAltitude, 
    altitudeData, 
    showHeartRate, 
    heartRateData, 
    (event: ChartEvent) => {
      if (event.native) {
        event.native.preventDefault();
        event.native.stopPropagation();
      }
      setIsModalOpen(true);
    },
    paceData // Passer les données d'allure pour calculer les limites de l'axe X
  );

  // Fonctions de contrôle
  const handleToggleAltitude = () => setShowAltitude(!showAltitude);
  const handleToggleHeartRate = () => setShowHeartRate(!showHeartRate);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <span className="ml-2 text-gray-600">Chargement des données...</span>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Analyse de l&apos;Allure avec Profil d&apos;Altitude
          </h3>
          
          <ChartControls
            altitudeData={altitudeData}
            heartRateData={heartRateData}
            showAltitude={showAltitude}
            showHeartRate={showHeartRate}
            onToggleAltitude={handleToggleAltitude}
            onToggleHeartRate={handleToggleHeartRate}
          />
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
            <div className="h-64">              <Line 
                data={chartData} 
                options={chartOptions} 
              />
            </div>
            
            <div className="mt-4 text-xs text-gray-500 text-center">
              <p>Cliquez sur le graphique pour agrandir • {paceData.length} points de données</p>
              {altitudeData.length > 0 && <span> • {altitudeData.length} points d&apos;altitude</span>}
              {heartRateData.length > 0 && <span> • {heartRateData.length} points de FC</span>}
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 48 48">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7 20l2 2 4-4M7 28l2 2 4-4M13 12h24M13 20h24M13 28h24" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Aucune donnée disponible</h3>
            <p className="mt-1 text-sm text-gray-500">
              Les données d&apos;allure ne sont pas disponibles pour cette activité.
            </p>
          </div>
        )}      </div>

      {/* Modal agrandi */}
      {isModalOpen && (
        <div className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl ring-1 ring-gray-900/10 max-w-7xl w-full h-[600px] flex flex-col transform transition-all duration-300 ease-out scale-100 opacity-100" style={{ 
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.1)' 
          }}>
            {/* En-tête du modal */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Analyse de l&apos;Allure avec Profil d&apos;Altitude
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {activity.name} • {paceData.length} points de données • {altitudeData.length} points d&apos;altitude • {heartRateData.length} points de FC
                </p>
              </div>
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
            <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
              {/* Contrôles en haut */}
              <div className="mb-4 flex items-center justify-between">
                <ChartControls
                  altitudeData={altitudeData}
                  heartRateData={heartRateData}
                  showAltitude={showAltitude}
                  showHeartRate={showHeartRate}
                  onToggleAltitude={handleToggleAltitude}
                  onToggleHeartRate={handleToggleHeartRate}
                />              </div>

              {/* Graphique principal du modal */}
              <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
                <div className="h-96">                  <Line 
                    data={chartData} 
                    options={{
                      ...chartOptions,
                      onClick: () => {}, // Désactiver le clic dans le modal
                    }} 
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
