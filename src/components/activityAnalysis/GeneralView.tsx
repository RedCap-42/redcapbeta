'use client';

import AnalyseGeneral from './AnalyseGeneral';

interface Activity {
  id: string;
  activity_id: number;
  start_time: string;
  name: string;
  distance: number;
  duration: number;
  sport_type: string;
  elevation_gain?: number | null;
  fit_file_path?: string;
}

interface GeneralViewProps {
  activity: Activity | null;
}

export default function GeneralView({ activity }: GeneralViewProps) {
  if (!activity) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Aucune activité sélectionnée</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {activity.name}
        </h2>
        <p className="text-gray-500">
          {new Date(activity.start_time).toLocaleDateString('fr-FR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </p>
      </div>

      {/* Widget Analyse générale */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <AnalyseGeneral activity={activity} />
      </div>
    </div>
  );
}