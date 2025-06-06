'use client';

type Activity = {
  id: string;
  activity_id: number;
  start_time: string;
  name: string;
  distance: number;
  duration: number;
  sport_type: string;
  elevation_gain?: number | null;
};

type ActivityAnalysisDetailProps = {
  activity: Activity;
  onBackAction: () => void;
};

export default function ActivityAnalysisDetail({ activity, onBackAction }: ActivityAnalysisDetailProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Analyse détaillée</h2>
        <button
          onClick={onBackAction}
          className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded inline-flex items-center"
        >
          <span>Retour</span>
        </button>
      </div>

      <div className="mb-4">
        <h3 className="text-xl font-semibold mb-2">{activity.name}</h3>
        <p className="text-gray-600">
          {new Date(activity.start_time).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          })}
        </p>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Analyse avancée</h3>
        <p>Hello World! Cette page contiendra l&apos;analyse détaillée de l&apos;activité.</p>
      </div>
    </div>
  );
}
