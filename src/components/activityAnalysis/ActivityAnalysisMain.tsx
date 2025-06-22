'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AnalysisTabs from './AnalysisTabs';
import GeneralView from './GeneralView';
import AnalysisView from './AnalysisView';
import { Toolbox } from '@/components/widgets/toolboxWidget';

interface ActivityAnalysisMainProps {
  initialActivity?: {
    activity_name?: string;
    start_time?: string;
    distance?: number;
    duration?: number;
    elevation_gain?: number;
    avg_heart_rate?: number;
    max_heart_rate?: number;
    [key: string]: unknown;
  } | null;
}

export default function ActivityAnalysisMain({ initialActivity }: ActivityAnalysisMainProps) {
  const [activeTab, setActiveTab] = useState('general');
  const [activityData, setActivityData] = useState(initialActivity || null);
  const [isToolboxOpen, setIsToolboxOpen] = useState(false);
  const router = useRouter();

  const toggleToolbox = () => {
    setIsToolboxOpen(!isToolboxOpen);
  };

  useEffect(() => {
    // Récupérer l'activité depuis sessionStorage si disponible
    const storedActivity = sessionStorage.getItem('trainingPlanSelectedActivity');
    if (storedActivity) {
      try {
        const parsedActivity = JSON.parse(storedActivity);
        setActivityData(parsedActivity);
      } catch (error) {
        console.error('Erreur lors du parsing de l\'activité:', error);
      }
    }
  }, []);  const renderTabContent = () => {
    // Convertir activityData vers le format Activity attendu par les composants
    const convertedActivity = activityData ? {
      id: String(activityData.activity_id || activityData.id || ''),
      activity_id: Number(activityData.activity_id || 0),
      start_time: String(activityData.start_time || ''),
      name: String(activityData.activity_name || activityData.name || 'Activité'),
      distance: Number(activityData.distance || 0),
      duration: Number(activityData.duration || 0),
      sport_type: String(activityData.sport_type || activityData.activity_type || 'running'),
      elevation_gain: activityData.elevation_gain || null,
      fit_file_path: String(activityData.fit_file_path || '')
    } : null;

    switch (activeTab) {
      case 'general':
        return <GeneralView activity={convertedActivity} />;
      case 'analysis':
        return <AnalysisView activity={convertedActivity} />;
      default:
        return <GeneralView activity={convertedActivity} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.back()}
              className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm font-medium">Retour</span>
            </button>
            <div className="h-6 w-px bg-gray-300"></div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Analyse Détaillée</h1>
              {activityData && (
                <p className="text-sm text-gray-500">
                  {activityData.activity_name || 'Activité'} • {activityData.start_time && new Date(activityData.start_time).toLocaleDateString('fr-FR')}
                </p>
              )}
            </div>
          </div>
          
          <button
            onClick={toggleToolbox}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-sm font-medium">Boîte à outils</span>
          </button>
        </div>
      </div>      {/* Contenu principal avec onglets */}
      <AnalysisTabs activeTab={activeTab} onTabChange={setActiveTab}>
        {renderTabContent()}
      </AnalysisTabs>      {/* Boîte à outils */}
      {isToolboxOpen && activityData && (
        <Toolbox
          activity={{
            id: String(activityData.activity_id || activityData.id || ''),
            activity_id: Number(activityData.activity_id || 0),
            start_time: String(activityData.start_time || ''),
            name: String(activityData.activity_name || activityData.name || 'Activité'),
            distance: Number(activityData.distance || 0),
            duration: Number(activityData.duration || 0),
            sport_type: String(activityData.sport_type || activityData.activity_type || 'running'),
            elevation_gain: activityData.elevation_gain || null,
            fit_file_path: String(activityData.fit_file_path || '')
          }}
          isOpen={isToolboxOpen}
          onClose={toggleToolbox}
        />
      )}
    </div>
  );
}
