'use client';

import { useState } from 'react';
import AnalyseGeneral from './AnalyseGeneral';
import AltitudeAllure from './AltitudeAllure';
import { Toolbox } from '@/components/widgets/toolboxWidget';

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

type ActivityAnalysisDetailProps = {
  activity: Activity;
  onBackAction: () => void;
};

export default function ActivityAnalysisDetail({ activity, onBackAction }: ActivityAnalysisDetailProps) {
  const [isToolboxOpen, setIsToolboxOpen] = useState(false);

  const toggleToolbox = () => {
    setIsToolboxOpen(!isToolboxOpen);
  };

  return (
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Analyse Détaillée</h2>
          <div className="flex space-x-3">
            <button
              onClick={toggleToolbox}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg inline-flex items-center transition-colors shadow-sm"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Boîte à outils</span>
            </button>
            <button
              onClick={onBackAction}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-lg inline-flex items-center transition-colors shadow-sm"
            >
              <svg className="w-4 h-4 mr-2" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor"><path d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
              <span>Retour</span>
            </button>
          </div>
        </div>

        <div className="mb-8 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
          <h3 className="text-xl font-semibold text-indigo-800 mb-1">{activity.name}</h3>
          <p className="text-sm text-indigo-700">
            {new Date(activity.start_time).toLocaleDateString('fr-FR', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
            })}
          </p>
        </div>        <div className="space-y-4">
          {/* Première ligne : Métriques principales */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Analyse générale - taille fixe et compacte */}
            <div className="lg:col-span-1">
              <div className="p-3 rounded-lg border border-gray-200 shadow-sm bg-gray-50">
                <AnalyseGeneral activity={activity} />
              </div>
            </div>            {/* Graphiques - répartis sur 3 colonnes */}
            <div className="lg:col-span-3 space-y-4">
              {/* Analyse de l'allure avec profil d'altitude */}
              <div className="p-3 rounded-lg border border-gray-200 shadow-sm bg-white">
                <AltitudeAllure activity={activity} />
              </div>
            </div>
          </div>
        </div>

        {/* Toolbox Modal */}
        <Toolbox 
          activity={activity} 
          isOpen={isToolboxOpen} 
          onClose={toggleToolbox} 
        />

      </div>
  );
}