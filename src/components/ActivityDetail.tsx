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
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 w-72 h-[360px] flex flex-col justify-center items-center">
        <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
          <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
        </svg>
        <p className="text-gray-500 text-center text-sm">Sélectionnez une date avec une activité dans le calendrier pour voir les détails.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 w-72">
      <div className="p-3 border-b border-gray-200 bg-gray-50">
        <h3 className="font-semibold text-gray-700 text-sm">Détails de l&apos;activité</h3>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-base text-gray-800 truncate pr-2" title={activity.name}>{activity.name}</h4>
          <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-medium">
            {activity.sport_type}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
          <div>
            <p className="text-xs text-gray-500">Date</p>
            <p className="font-medium text-gray-700">
              {new Date(activity.start_time).toLocaleDateString('fr-FR', {day: '2-digit', month: 'short', year: 'numeric'})}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-500">Heure</p>
            <p className="font-medium text-gray-700">{formatTime(activity.start_time)}</p>
          </div>

          <div>
            <p className="text-xs text-gray-500">Durée</p>
            <p className="font-medium text-gray-700">{formatDuration(activity.duration)}</p>
          </div>

          <div>
            <p className="text-xs text-gray-500">Distance</p>
            <p className="font-medium text-gray-700">{formatDistance(activity.distance)} km</p>
          </div>

          {activity.elevation_gain !== null && activity.elevation_gain !== undefined && (
            <div className="col-span-2">
              <p className="text-xs text-gray-500">Dénivelé+</p>
              <p className="font-medium text-gray-700">{activity.elevation_gain} m</p>
            </div>
          )}
        </div>

        {onAnalyze && (
          <div className="pt-3 mt-2 border-t border-gray-200">
            <button
              onClick={onAnalyze}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-md shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Analyser cette activité
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
