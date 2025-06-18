import { ChartEvent } from 'chart.js';

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

// Fonction pour formater les secondes en min:sec
export const formatPaceFromSeconds = (paceInSeconds: number): string => {
  const minutes = Math.floor(paceInSeconds / 60);
  const seconds = Math.floor(paceInSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

// Configuration des données du graphique
export const createChartData = (
  paceData: PaceDataPoint[],
  altitudeData: AltitudeDataPoint[],
  heartRateData: HeartRateDataPoint[],
  showAltitude: boolean,
  showHeartRate: boolean
) => ({
  datasets: [
    {
      label: 'Allure (min/km)',
      data: paceData.map(point => ({
        x: point.distance, // Utiliser la vraie distance comme coordonnée X
        y: point.pace / 60  // Allure en minutes
      })),
      borderColor: 'rgb(79, 70, 229)',
      backgroundColor: 'rgba(79, 70, 229, 0.1)',
      borderWidth: 3,
      pointRadius: 0,
      pointHoverRadius: 8,
      pointHitRadius: 15,
      pointHoverBackgroundColor: 'rgb(79, 70, 229)',
      pointHoverBorderColor: 'white',
      pointHoverBorderWidth: 2,
      tension: 0,
      yAxisID: 'y',
      fill: false,
    },
    ...(showAltitude && altitudeData.length > 0 ? [{
      label: 'Altitude (m)',
      data: altitudeData.map(point => ({
        x: point.distance, // Utiliser la vraie distance comme coordonnée X
        y: point.altitude
      })),
      borderColor: 'rgb(16, 185, 129)', // Emerald-500
      backgroundColor: 'rgba(16, 185, 129, 0.2)',
      borderWidth: 3,
      pointRadius: 0,
      pointHoverRadius: 8,
      pointHitRadius: 15,
      pointHoverBackgroundColor: 'rgb(16, 185, 129)',
      pointHoverBorderColor: 'white',
      pointHoverBorderWidth: 2,
      tension: 0.2,
      yAxisID: 'y1',
      fill: 'start',
    }] : []),
    ...(showHeartRate && heartRateData.length > 0 ? [{
      label: 'Fréquence cardiaque (bpm)',
      data: heartRateData.map(point => ({
        x: point.distance, // Utiliser la vraie distance comme coordonnée X
        y: point.heartRate
      })),
      borderColor: 'rgb(239, 68, 68)', // Rouge pour la fréquence cardiaque
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      borderWidth: 3,
      pointRadius: 0,
      pointHoverRadius: 8,
      pointHitRadius: 15,
      pointHoverBackgroundColor: 'rgb(239, 68, 68)',
      pointHoverBorderColor: 'white',
      pointHoverBorderWidth: 2,
      tension: 0.1, // Léger lissage pour la fréquence cardiaque
      yAxisID: showAltitude ? 'y3' : 'y2', // Utiliser y3 si l'altitude est affichée, sinon y2
      fill: false,
    }] : [])
  ],
});

// Configuration des options du graphique
export const createChartOptions = (
  showAltitude: boolean,
  altitudeData: AltitudeDataPoint[],
  showHeartRate: boolean,
  heartRateData: HeartRateDataPoint[],
  onChartClick: (event: ChartEvent) => void,
  paceData: PaceDataPoint[] = [] // Ajouter les données d'allure pour calculer les limites
) => {
  // Calculer les limites de distance basées sur les données d'allure
  const distances = paceData.map(p => p.distance);
  const minDistance = distances.length > 0 ? Math.min(...distances) : 0;
  const maxDistance = distances.length > 0 ? Math.max(...distances) : 10;
  
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    onClick: onChartClick,
    plugins: {
      legend: {
        display: (showAltitude && altitudeData.length > 0) || (showHeartRate && heartRateData.length > 0),
        position: 'top' as const,
        onClick: () => {}, // Désactiver le clic sur la légende
      },
      title: {
        display: false,
      },
      tooltip: {
        intersect: false,
        mode: 'index' as const,
        displayColors: true,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        cornerRadius: 8,
        caretPadding: 20,
        xPadding: 12,
        yPadding: 8,
        position: 'nearest' as const,
        xAlign: 'right' as const,
        yAlign: 'center' as const,
        callbacks: {
          title: function(context: unknown[]) {
            if (context.length > 0) {
              const firstContext = context[0] as { parsed: { x: number } };
              // Utiliser la coordonnée X qui contient la vraie distance
              const distance = firstContext.parsed.x;
              if (!isNaN(distance)) {
                return `Distance: ${distance.toFixed(2)} km`;
              }
              return '';
            }
            return '';
          },
          label: function(context: { dataset: { label?: string }, parsed: { y: number } }) {
            const label = context.dataset.label || '';
            if (label.includes('Allure')) {
              return `${label}: ${formatPaceFromSeconds(context.parsed.y * 60)}`;
            } else if (label.includes('Altitude')) {
              return `${label}: ${context.parsed.y.toFixed(0)}m`;
            } else if (label.includes('Fréquence')) {
              return `${label}: ${context.parsed.y.toFixed(0)} bpm`;
            }
            return `${label}: ${context.parsed.y}`;
          }
        }
      }
    },
    scales: {
      x: {
        type: 'linear' as const, // Utiliser un axe linéaire pour les vraies distances
        display: true,
        title: {
          display: true,
          text: 'Distance (km)',          color: '#374151',
          font: {
            size: 12,
            weight: 'bold' as const
          }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
          drawOnChartArea: true,
          drawTicks: true,
        },
        ticks: {
          color: '#6B7280',
          font: {
            size: 11
          },
          callback: function(value: string | number) {
            const numValue = typeof value === 'string' ? parseFloat(value) : value;
            if (isNaN(numValue)) return '';
            return numValue.toFixed(1) + ' km';
          },
          maxTicksLimit: 8,
          autoSkip: true,
          autoSkipPadding: 10
        },
        beginAtZero: false,
        // Adapter l'axe X exactement aux données pour éviter l'espace vide
        min: minDistance > 0 ? Math.max(0, minDistance - 0.1) : 0,
        max: maxDistance + 0.1
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Allure (min/km)',          color: '#4F46E5',
          font: {
            size: 12,
            weight: 'bold' as const
          }
        },
        grid: {
          color: 'rgba(79, 70, 229, 0.1)',
          drawOnChartArea: true,
          drawTicks: true,
        },
        ticks: {
          color: '#4F46E5',
          font: {
            size: 11
          },
          callback: function(value: string | number) {
            const numValue = typeof value === 'string' ? parseFloat(value) : value;
            if (isNaN(numValue)) return '';
            return formatPaceFromSeconds(numValue * 60);
          },
          precision: 1,
          maxTicksLimit: 8
        },
        reverse: true, // L'allure est inversée (plus bas = plus rapide)
        beginAtZero: false
      },
      ...(showAltitude && altitudeData.length > 0 ? {
        y1: {
          type: 'linear' as const,
          display: true,
          position: 'right' as const,
          title: {
            display: true,
            text: 'Altitude (m)',            color: '#10B981',
            font: {
              size: 12,
              weight: 'bold' as const
            }
          },
          grid: {
            drawOnChartArea: false, // Ne pas dessiner la grille pour éviter les superpositions
            drawTicks: true,
          },
          ticks: {
            color: '#10B981',
            font: {
              size: 11
            },
            callback: function(value: string | number) {
              const numValue = typeof value === 'string' ? parseFloat(value) : value;
              if (isNaN(numValue)) return '';
              return Math.round(numValue) + ' m';
            },
            maxTicksLimit: 6,
            precision: 0
          },
          beginAtZero: false,
          // Calculer les limites basées sur les données d'altitude
          min: Math.floor(Math.min(...altitudeData.map(d => d.altitude)) - 10),
          max: Math.ceil(Math.max(...altitudeData.map(d => d.altitude)) + 10)
        }
      } : {}),
      ...(showHeartRate && heartRateData.length > 0 ? {
        [showAltitude ? 'y3' : 'y2']: {
          type: 'linear' as const,
          display: true,
          position: showAltitude ? 'left' as const : 'right' as const, // À gauche si altitude présente, sinon à droite
          title: {
            display: true,
            text: 'FC (bpm)',            color: '#EF4444',
            font: {
              size: 12,
              weight: 'bold' as const
            }
          },
          grid: {
            drawOnChartArea: false,
            drawTicks: true,
          },
          ticks: {
            color: '#EF4444',
            font: {
              size: 11
            },
            callback: function(value: string | number) {
              const numValue = typeof value === 'string' ? parseFloat(value) : value;
              if (isNaN(numValue)) return '';
              return Math.round(numValue) + ' bpm';
            },
            maxTicksLimit: 6,
            precision: 0
          },
          beginAtZero: false,
          // Calculer les limites basées sur les données de fréquence cardiaque
          min: Math.floor(Math.min(...heartRateData.map(d => d.heartRate)) - 5),
          max: Math.ceil(Math.max(...heartRateData.map(d => d.heartRate)) + 5),
          // Si l'altitude est présente, décaler l'axe vers l'intérieur
          offset: showAltitude
        }
      } : {})
    }
  };
};
