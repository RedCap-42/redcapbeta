'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import FitParser from 'fit-file-parser';
import { buildGPX, GarminBuilder } from 'gpx-builder';

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

interface FitRecord {
  position_lat?: number;
  position_long?: number;
  timestamp?: Date;
  altitude?: number;
  enhanced_altitude?: number;
  [key: string]: unknown;
}

interface FitData {
  records?: FitRecord[];
  [key: string]: unknown;
}

interface GPSPoint {
  lat: number;
  lon: number;
  time: Date;
  ele?: number;
}

/**
 * Génère un fichier GPX à partir des points GPS en utilisant GarminBuilder
 */
function generateGPX(gpsPoints: GPSPoint[], activity: Activity): string {
  const { Point } = GarminBuilder.MODELS;
  
  // Convertir les points GPS vers le format Point de GarminBuilder
  const points = gpsPoints.map(point => new Point(
    point.lat,
    point.lon,
    {
      time: point.time,
      ...(point.ele !== undefined && { ele: point.ele })
    }
  ));

  // Créer le builder Garmin
  const garminBuilder = new GarminBuilder();
  
  // Définir les points de segment
  garminBuilder.setSegmentPoints(points);
  
  // Ajouter des métadonnées pour l'activité
  const gpxData = garminBuilder.toObject();
  if (gpxData.trk && gpxData.trk.length > 0) {
    gpxData.trk[0].name = activity.name;
  }
  
  // Générer le GPX
  return buildGPX(gpxData);
}

export async function exportActivityToGPX(activity: Activity): Promise<void> {
  const supabase = createClientComponentClient();

  try {
    console.log(`Début de l'export GPX pour l'activité: ${activity.name}`);

    // Obtenir l'utilisateur connecté
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Utilisateur non connecté');
    }

    // Essayer plusieurs chemins possibles pour trouver le fichier FIT
    const pathsToTry = [
      activity.fit_file_path ? activity.fit_file_path : null,
      `${user.id}/fitFiles/${activity.activity_id}.fit`,
      `${user.id}/${activity.activity_id}.fit`,
      `${user.id}/files/${activity.activity_id}.fit`,
      `${user.id}/activities/${activity.activity_id}.fit`,
    ].filter(Boolean);

    console.log(`Tentative avec ${pathsToTry.length} chemins possibles`);

    let fitData: Blob | null = null;
    let usedPath: string | null = null;

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
      }
    }

    if (!fitData) {
      throw new Error('Impossible de télécharger le fichier FIT. Vérifiez que l\'activité contient des données GPS.');
    }

    console.log(`Analyse du fichier FIT récupéré via le chemin: ${usedPath}`);

    // Convertir le blob en ArrayBuffer
    const arrayBuffer = await fitData.arrayBuffer();

    // Parser le fichier FIT
    const fitParser = new FitParser({
      force: true,
      speedUnit: 'm/s',
      lengthUnit: 'm',
      elapsedRecordField: true,
      mode: 'list',
    });

    // Parse le fichier FIT de manière synchrone dans une Promise
    const parsedData = await new Promise<FitData>((resolve, reject) => {
      (fitParser.parse as (content: ArrayBuffer, callback: (err: Error, data: FitData) => void) => void)(
        arrayBuffer,
        (parseError: Error, data: FitData) => {
          if (parseError) {
            reject(parseError);
          } else {
            resolve(data);
          }
        }
      );
    });

    console.log('Fichier FIT parsé avec succès');

    // Extraire les points GPS
    const gpsPoints: GPSPoint[] = [];
    
    if (parsedData.records) {
      for (const record of parsedData.records) {        if (record.position_lat !== undefined && record.position_long !== undefined && record.timestamp) {
          // Les coordonnées sont déjà en degrés décimaux avec fit-file-parser
          const lat = record.position_lat;
          const lon = record.position_long;
          
          // Vérifier que les coordonnées sont valides
          if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
            const point: GPSPoint = {
              lat,
              lon,
              time: record.timestamp,
            };

            // Ajouter l'altitude si disponible
            if (record.enhanced_altitude !== undefined) {
              point.ele = record.enhanced_altitude;
            } else if (record.altitude !== undefined) {
              point.ele = record.altitude;
            }

            gpsPoints.push(point);
          }
        }
      }
    }    console.log(`Points GPS extraits: ${gpsPoints.length}`);

    if (gpsPoints.length === 0) {
      throw new Error('Aucune donnée GPS trouvée dans le fichier FIT. Cette activité ne peut pas être exportée en GPX (activité en intérieur?).');
    }

    // Debug: afficher quelques points pour vérifier les coordonnées
    if (gpsPoints.length > 0) {
      console.log('Premier point GPS:', gpsPoints[0]);
      console.log('Dernier point GPS:', gpsPoints[gpsPoints.length - 1]);
    }

    // Générer le GPX avec GarminBuilder
    console.log('Génération du GPX avec GarminBuilder pour des coordonnées GPS précises...');
    const gpxData = generateGPX(gpsPoints, activity);

    // Créer un nom de fichier sûr
    const safeFileName = activity.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const fileName = `${safeFileName}_${activity.activity_id}.gpx`;

    // Télécharger le fichier GPX
    const blob = new Blob([gpxData], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log(`Export GPX terminé avec succès: ${fileName}`);
    
  } catch (error) {
    console.error('Erreur lors de l\'export GPX:', error);
    alert(`Erreur lors de l'export GPX: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    throw error;
  }
}
