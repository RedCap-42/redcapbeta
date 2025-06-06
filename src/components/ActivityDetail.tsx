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

type ActivityDetailProps = {
  activity: Activity | null;
  onAnalyze?: () => void;
};

export default function ActivityDetail({ activity, onAnalyze }: ActivityDetailProps) {
  // Formatter la durée en format lisible (HH:MM:SS)
  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    return [
      hrs.toString().padStart(2, '0'),
      mins.toString().padStart(2, '0'),
      secs.toString().padStart(2, '0')
    ].join(':');
  };

  // Formatter la distance (de mètres à kilomètres)
  const formatDistance = (meters: number) => {
    return (meters / 1000).toFixed(2);
  };

  // Fonction d'aide pour formater l'heure seulement
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!activity) {
    return (
      <div className="bg-white rounded-lg shadow p-4 w-72 h-[350px] flex flex-col justify-center items-center">
        <p className="text-gray-500 text-center">Sélectionnez une date avec une activité dans le calendrier</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow w-72">
      <div className="p-4 border-b border-gray-100 bg-gray-50">
        <h3 className="font-semibold text-gray-700">Détails de l&apos;activité</h3>
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-base truncate">{activity.name}</h4>
          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
            {activity.sport_type}
          </span>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-xs text-gray-500 mb-1">Date</p>
            <p className="text-sm font-medium">
              {new Date(activity.start_time).toLocaleDateString('fr-FR')}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-500 mb-1">Heure</p>
            <p className="text-sm font-medium">{formatTime(activity.start_time)}</p>
          </div>

          <div>
            <p className="text-xs text-gray-500 mb-1">Durée</p>
            <p className="text-sm font-medium">{formatDuration(activity.duration)}</p>
          </div>

          <div>
            <p className="text-xs text-gray-500 mb-1">Distance</p>
            <p className="text-sm font-medium">{formatDistance(activity.distance)} km</p>
          </div>

          {onAnalyze && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <button
                onClick={onAnalyze}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-md transition-colors"
              >
                Analyser cette activité
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
