'use client';

interface ChartControlsProps {
  altitudeData: { distance: number; altitude: number }[];
  heartRateData: { distance: number; heartRate: number }[];
  showAltitude: boolean;
  showHeartRate: boolean;
  onToggleAltitude: () => void;
  onToggleHeartRate: () => void;
}

export default function ChartControls({
  altitudeData,
  heartRateData,
  showAltitude,
  showHeartRate,
  onToggleAltitude,
  onToggleHeartRate
}: ChartControlsProps) {
  return (
    <div className="flex items-center space-x-2">
      {/* Bouton pour activer/désactiver l'affichage de l'altitude */}
      {altitudeData.length > 0 && (
        <button
          onClick={onToggleAltitude}
          className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
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

      {/* Bouton pour activer/désactiver l'affichage de la fréquence cardiaque */}
      {heartRateData.length > 0 && (
        <button
          onClick={onToggleHeartRate}
          className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            showHeartRate
              ? 'bg-red-100 text-red-800 hover:bg-red-200'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <svg 
            className={`w-4 h-4 mr-2 transition-colors ${showHeartRate ? 'text-red-600' : 'text-gray-500'}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" 
            />
          </svg>
          {showHeartRate ? 'Masquer la fréquence cardiaque' : 'Afficher la fréquence cardiaque'}
        </button>
      )}
    </div>
  );
}
