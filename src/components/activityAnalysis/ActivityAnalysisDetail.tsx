'use client';

import AnalyseGeneral from './AnalyseGeneral';
import AltitudeAllure from './AltitudeAllure';

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
  return (
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Analyse Détaillée</h2>
          <button
              onClick={onBackAction}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-lg inline-flex items-center transition-colors shadow-sm"
          >
            <svg className="w-4 h-4 mr-2" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor"><path d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
            <span>Retour</span>
          </button>
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

      </div>
  );
}