'use client';

import AltitudeAllure from './AltitudeAllure';

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

interface AnalysisViewProps {
  activity: Activity | null;
}

export default function AnalysisView({ activity }: AnalysisViewProps) {
  if (!activity) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Aucune activité sélectionnée</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <AltitudeAllure activity={activity} />
    </div>
  );
}
