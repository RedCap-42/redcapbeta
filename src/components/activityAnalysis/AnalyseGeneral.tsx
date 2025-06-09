'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import FitParser from 'fit-file-parser';
import { useAuth } from '@/context/AuthContext';

// Define interfaces for FIT file data
interface FitRecord {
  heart_rate?: number;
  altitude?: number;
  enhanced_altitude?: number;
  [key: string]: unknown;
}

interface FitSession {
  total_ascent?: number;
  enhanced_total_ascent?: number;
  avg_heart_rate?: number;
  max_heart_rate?: number;
  [key: string]: unknown;
}

interface FitData {
  sessions?: FitSession[];
  records?: FitRecord[];
  [key: string]: unknown;
}

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

type HeartRateData = {
  average: number | null;
  max: number | null;
};

type AnalyseGeneralProps = {
  activity: Activity;
};

export default function AnalyseGeneral({ activity }: AnalyseGeneralProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [heartRate, setHeartRate] = useState<HeartRateData>({ average: null, max: null });
  const [calculatedPace, setCalculatedPace] = useState<string | null>(null);
  const [elevationGain, setElevationGain] = useState<number | null>(activity.elevation_gain || null);
  const supabase = createClientComponentClient();
  const { user } = useAuth();

  // Fonction pour formater l'allure en min:sec/km
  const formatPace = useCallback((distanceInMeters: number, durationInSeconds: number): string => {
    if (!distanceInMeters || !durationInSeconds || distanceInMeters <= 0) return '-';

    // Calculer le nombre de secondes par kilomètre
    const paceInSeconds = (durationInSeconds / (distanceInMeters / 1000));

    // Convertir en minutes et secondes
    const minutes = Math.floor(paceInSeconds / 60);
    const seconds = Math.floor(paceInSeconds % 60);

    // Formater avec les zéros
    return `${minutes}min ${seconds.toString().padStart(2, '0')}s/km`;
  }, []);

  // Fonction pour formater la durée en heures:minutes:secondes
  const formatDuration = (durationInSeconds: number): string => {
    if (!durationInSeconds) return '-';

    const hours = Math.floor(durationInSeconds / 3600);
    const minutes = Math.floor((durationInSeconds % 3600) / 60);
    const seconds = Math.floor(durationInSeconds % 60);

    if (hours > 0) {
      return `${hours}h ${minutes.toString().padStart(2, '0')}min ${seconds.toString().padStart(2, '0')}s`;
    }
    return `${minutes}min ${seconds.toString().padStart(2, '0')}s`;
  };

  // Fonction pour calculer le dénivelé positif à partir des points d'altitude
  const calculateElevationGain = useCallback((altitudePoints: number[]): number => {
    if (!altitudePoints || altitudePoints.length <= 1) return 0;

    let totalGain = 0;

    // Filtrer les valeurs invalides (null, undefined, NaN)
    const validPoints = altitudePoints.filter(point =>
      point !== null && point !== undefined && !isNaN(point));

    for (let i = 1; i < validPoints.length; i++) {
      const diff = validPoints[i] - validPoints[i-1];
      // Ajouter uniquement les différences positives (montées)
      if (diff > 0) {
        totalGain += diff;
      }
    }

    return Math.round(totalGain);
  }, []);
  // Fonction pour analyser et traiter les données du fichier FIT
  const parseAndProcessFitFile = useCallback((arrayBuffer: ArrayBuffer) => {    // Analyser le fichier FIT
    const fitParser = new FitParser({
      force: true,
      speedUnit: 'km/h',
      lengthUnit: 'm',
      temperatureUnit: 'celsius',
      elapsedRecordField: true,
      mode: 'list',
    });

    // Utiliser l'API callback-based au lieu de l'API event-based
    (fitParser.parse as (content: ArrayBuffer, callback: (err: Error, data: FitData) => void) => void)(
      arrayBuffer,
      (parseError: Error, data: FitData) => {
        if (parseError) {
          console.error('Erreur lors de l\'analyse du fichier FIT:', parseError);
          setError("Erreur lors de l'analyse des données");
          return;
        }

        console.log('Données FIT analysées:', Object.keys(data));

        // Extraire les données de fréquence cardiaque
        let avgHr: number | null = null;
        let maxHr: number | null = null;
        let calculatedElevationGain: number | null = null;

        // Chercher le D+ dans les sessions
        if (data.sessions && data.sessions.length > 0) {
          const session = data.sessions[0];
          avgHr = session.avg_heart_rate ?? null;
          maxHr = session.max_heart_rate ?? null;

          // Vérifier si le dénivelé est disponible dans la session
          if (session.total_ascent !== undefined) {
            calculatedElevationGain = session.total_ascent;
            console.log('Dénivelé positif trouvé dans la session:', calculatedElevationGain);
          }
        }

        // Si le D+ n'est pas dans les sessions, essayer de le calculer à partir des records
        if (calculatedElevationGain === null && data.records && data.records.length > 0) {
          const altitudePoints = data.records
            .filter((record: FitRecord) => record.altitude !== undefined && record.altitude !== null)
            .map((record: FitRecord) => record.altitude as number);

          if (altitudePoints.length > 0) {
            calculatedElevationGain = calculateElevationGain(altitudePoints);
            console.log('Dénivelé positif calculé à partir des points:', calculatedElevationGain, 'Nombre de points:', altitudePoints.length);
          }
        }

        // Mettre à jour le dénivelé positif s'il a été trouvé ou calculé
        if (calculatedElevationGain !== null) {
          setElevationGain(calculatedElevationGain);
        }

        // Si pas trouvé dans les sessions, chercher dans les records
        if ((!avgHr || !maxHr) && data.records && data.records.length > 0) {
          const heartRates = data.records
            .filter((record: FitRecord) => record.heart_rate)
            .map((record: FitRecord) => record.heart_rate!);

          if (heartRates.length > 0) {
            avgHr = Math.round(heartRates.reduce((sum: number, hr: number) => sum + hr, 0) / heartRates.length);
            maxHr = Math.max(...heartRates);
          }
        }

        setHeartRate({
          average: avgHr,
          max: maxHr,
        });

        // Calculer l'allure moyenne
        if (activity.distance && activity.duration) {
          setCalculatedPace(formatPace(activity.distance, activity.duration));
        }
      }
    );
  }, [activity.distance, activity.duration, calculateElevationGain, formatPace]);

  // Charger et analyser le fichier FIT pour extraire les données supplémentaires
  const loadFitFileData = useCallback(async () => {
    if (!user) {
      setError("Utilisateur non connecté");
      return;
    }

    // Initialiser l'allure moyenne même sans fichier FIT
    if (activity.distance && activity.duration) {
      setCalculatedPace(formatPace(activity.distance, activity.duration));
    }

    // Si aucun chemin de fichier FIT n'est spécifié, essayer de le construire à partir de l'ID d'activité
    const fitFilePathToTry = activity.fit_file_path || `${activity.activity_id}.fit`;

    try {
      setLoading(true);
      setError(null);

      console.log(`Activité: ${activity.name}, ID: ${activity.activity_id}`);
      console.log(`Tentative de téléchargement du fichier FIT avec chemin: ${fitFilePathToTry}`);

      // Essayer plusieurs chemins possibles dans l'ordre de priorité
      const pathsToTry = [
        // 1. Chemin directement stocké dans l'activité (si non vide)
        activity.fit_file_path ? activity.fit_file_path : null,

        // 2. userId/fitFiles/activity_id.fit (structure standard)
        `${user.id}/fitFiles/${activity.activity_id}.fit`,

        // 3. userId/activity_id.fit (structure simplifiée)
        `${user.id}/${activity.activity_id}.fit`,

        // 4. Chemin avec le dossier "files" qui pourrait être utilisé
        `${user.id}/files/${activity.activity_id}.fit`,

        // 5. Chemin avec l'activité préfixée
        `${user.id}/activities/${activity.activity_id}.fit`,
      ].filter(Boolean); // Filtrer les valeurs null

      console.log(`Tentative avec ${pathsToTry.length} chemins possibles:`, pathsToTry);      
      
      let fitData: Blob | null = null;
      let usedPath: string | null = null;
      const allErrors: string[] = [];

      // Essayer chaque chemin jusqu'à ce qu'un fonctionne
      for (const path of pathsToTry) {
        if (!path) continue;

        console.log(`Essai avec le chemin: ${path}`);
        const { data, error: downloadError } = await supabase
          .storage
          .from('database')
          .download(path);

        if (!downloadError && data) {
          fitData = data;
          usedPath = path;
          console.log(`Fichier FIT trouvé avec le chemin: ${path}`);
          break;
        } else {
          console.log(`Échec avec le chemin ${path}:`, downloadError?.message);
          allErrors.push(`${path}: ${downloadError?.message}`);
        }
      }

      // Si aucun chemin n'a fonctionné
      if (!fitData) {
        console.error('Tous les chemins ont échoué:', allErrors);
        setError(`Impossible de télécharger le fichier FIT après ${pathsToTry.length} tentatives.`);
        return;
      }

      console.log(`Analyse du fichier FIT récupéré via le chemin: ${usedPath}`);

      // Convertir le Blob en ArrayBuffer pour le parser
      const arrayBuffer = await fitData.arrayBuffer();
      parseAndProcessFitFile(arrayBuffer);

    } catch (err) {
      console.error('Erreur inattendue:', err);
      setError("Une erreur s'est produite lors du traitement des données");
    } finally {
      setLoading(false);
    }
  }, [user, activity, supabase, parseAndProcessFitFile, formatPace]);

  useEffect(() => {
    if (activity.id) {
      loadFitFileData();
    }
  }, [activity.id, loadFitFileData]);

  return (
    <div className="w-full">
      <h3 className="text-sm font-semibold mb-3 text-gray-800">Analyse générale</h3>

      {loading && (
        <div className="flex justify-center py-2">
          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-xs text-gray-600">Chargement...</span>
        </div>
      )}

      {error && (
        <div className="p-2 mb-3 bg-red-50 border border-red-300 text-red-700 rounded text-xs">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
          <div className="text-xs text-gray-500 mb-1">Distance</div>
          <div className="font-semibold text-sm text-gray-800">{(activity.distance / 1000).toFixed(2)} km</div>
        </div>

        <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
          <div className="text-xs text-gray-500 mb-1">Durée</div>
          <div className="font-semibold text-sm text-gray-800">{formatDuration(activity.duration)}</div>
        </div>

        <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
          <div className="text-xs text-gray-500 mb-1">Allure</div>
          <div className="font-semibold text-sm text-gray-800">{calculatedPace || '-'}</div>
        </div>

        <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
          <div className="text-xs text-gray-500 mb-1">D+</div>
          <div className="font-semibold text-sm text-gray-800">{elevationGain ? `${elevationGain} m` : '-'}</div>
        </div>

        <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
          <div className="text-xs text-gray-500 mb-1">FC moy.</div>
          <div className="font-semibold text-sm text-gray-800">{heartRate.average ? `${heartRate.average} bpm` : '-'}</div>
        </div>

        <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
          <div className="text-xs text-gray-500 mb-1">FC max</div>
          <div className="font-semibold text-sm text-gray-800">{heartRate.max ? `${heartRate.max} bpm` : '-'}</div>
        </div>
      </div>
    </div>
  );
}
