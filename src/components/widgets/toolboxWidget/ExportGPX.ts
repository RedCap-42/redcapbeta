import FitParser from 'fit-file-parser';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { buildGPX } from 'gpx-builder';

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

type GPSPoint = {
  lat: number;
  lon: number;
  ele?: number;
  time: Date;
};

interface FitRecord {
  position_lat?: number;
  position_long?: number;
  timestamp?: Date;
  altitude?: number;
  enhanced_altitude?: number;
  heart_rate?: number;
  cadence?: number;
  speed?: number;
  enhanced_speed?: number;
  [key: string]: unknown;
}

interface FitData {
  records?: FitRecord[];
  [key: string]: unknown;
}

export async function exportActivityToGPX(activity: Activity): Promise<void> {
  try {
    // Obtenir l'utilisateur connecté
    const supabase = createClientComponentClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Utilisateur non connecté');
    }    console.log(`Export GPX - Activité: ${activity.name}, ID: ${activity.activity_id}, Type: ${activity.sport_type}`);

    // Essayer plusieurs chemins possibles dans l'ordre de priorité (même logique qu'Allure.tsx)
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
      `${user.id}/activities/${activity.activity_id}.fit`,    ].filter(Boolean); // Filtrer les valeurs null

    let fitData: Blob | null = null;
    let usedPath: string | null = null;    // Essayer chaque chemin jusqu'à ce qu'un fonctionne
    for (const path of pathsToTry) {
      if (!path) continue;

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

    // Si aucun chemin n'a fonctionné
    if (!fitData) {
      throw new Error(`Impossible de télécharger le fichier FIT après ${pathsToTry.length} tentatives.`);
    }    console.log(`Analyse du fichier FIT récupéré via: ${usedPath}`);

    // Convertir le blob en ArrayBuffer (même méthode qu'Allure.tsx)
    const arrayBuffer = await fitData.arrayBuffer();

    // Parser le fichier FIT (mêmes paramètres qu'Allure.tsx)
    const fitParser = new FitParser({
      force: true,
      speedUnit: 'm/s',
      lengthUnit: 'm',
      elapsedRecordField: true,
      mode: 'list',
    });

    // Utiliser la même méthode de parsing qu'Allure.tsx
    const gpsPoints = await new Promise<GPSPoint[]>((resolve, reject) => {
      (fitParser.parse as (content: ArrayBuffer, callback: (err: Error, data: FitData) => void) => void)(
        arrayBuffer,
        (parseError: Error, data: FitData) => {
          if (parseError) {
            console.error('Erreur lors du parsing du fichier FIT:', parseError);
            reject(new Error('Erreur lors de l\'analyse du fichier FIT'));
            return;
          }

          try {
            console.log('Données FIT reçues:', Object.keys(data));
            const gpsPointsArray: GPSPoint[] = [];            if (data.records && Array.isArray(data.records)) {
              console.log(`Nombre de records trouvés: ${data.records.length}`);
              
              // Débugger les premiers records pour voir ce qu'ils contiennent
              if (data.records.length > 0) {
                console.log('Premier record:', data.records[0]);
                console.log('Clés disponibles dans le premier record:', Object.keys(data.records[0]));
              }
              
              let recordsWithLatLon = 0;
              let recordsWithValidCoords = 0;
              
              data.records.forEach((record: FitRecord) => {
                // Débugger les champs position
                if (record.position_lat !== undefined || record.position_long !== undefined) {
                  recordsWithLatLon++;
                  console.log(`Record avec position: lat=${record.position_lat}, lon=${record.position_long}, timestamp=${record.timestamp}`);
                }
                
                // Vérifier si nous avons des coordonnées GPS
                if (record.position_lat && record.position_long && record.timestamp) {
                  // Convertir les coordonnées semicircles en degrés
                  const lat = record.position_lat * (180 / Math.pow(2, 31));
                  const lon = record.position_long * (180 / Math.pow(2, 31));
                    console.log(`Coordonnées converties: lat=${lat}, lon=${lon}`);
                  
                  // Filtrer les coordonnées invalides
                  if (lat !== 0 && lon !== 0 && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
                    recordsWithValidCoords++;
                    gpsPointsArray.push({
                      lat,
                      lon,
                      ele: record.enhanced_altitude || record.altitude,
                      time: record.timestamp
                    });
                  }
                }
              });
              
              console.log(`Records avec lat/lon: ${recordsWithLatLon}`);
              console.log(`Records avec coordonnées valides: ${recordsWithValidCoords}`);
            }

            console.log(`Points GPS extraits: ${gpsPointsArray.length}`);
            resolve(gpsPointsArray);
          } catch (err) {
            console.error('Erreur lors de l\'extraction des données GPS:', err);
            reject(new Error('Erreur lors du traitement des données GPS'));
          }
        }
      );
    });
      if (gpsPoints.length === 0) {
      // Message d'erreur plus explicite selon le type d'activité
      const isIndoorActivity = activity.sport_type?.toLowerCase().includes('treadmill') || 
                               activity.sport_type?.toLowerCase().includes('indoor') ||
                               activity.sport_type?.toLowerCase().includes('trainer');
      
      if (isIndoorActivity) {
        throw new Error(`Cette activité "${activity.sport_type}" ne contient pas de données GPS car elle a été réalisée en intérieur. L'export GPX n'est possible que pour les activités extérieures.`);
      } else {
        throw new Error(`Aucune donnée GPS trouvée dans le fichier FIT de cette activité "${activity.sport_type}". L'activité pourrait avoir été réalisée sans GPS activé.`);
      }
    }
      // Créer le contenu GPX avec gpx-builder
    const gpxContent = createGPXContent(activity, gpsPoints);
    
    // Créer un blob avec le contenu GPX
    const blob = new Blob([gpxContent], { type: 'application/gpx+xml' });
    
    // Créer un nom de fichier sûr
    const fileName = `${activity.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${activity.id}.gpx`;
    
    // Créer un lien de téléchargement et le déclencher
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    
    // Nettoyer
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log(`Fichier GPX exporté: ${fileName} avec ${gpsPoints.length} points GPS`);
    alert(`Fichier GPX exporté avec succès !\n${gpsPoints.length} points GPS inclus.`);
    
  } catch (error) {
    console.error('Erreur lors de l\'export GPX:', error);
    alert(`Erreur lors de l'export GPX: ${error}`);
    throw error;
  }
}

// Types pour gpx-builder - GPX classique sans extensions
interface GPXWaypoint {
  lat: number;
  lon: number;
  time: Date;
  ele?: number;
}

// Fonction pour convertir les données GPS en format GPX classique avec gpx-builder
function createGPXContent(activity: Activity, gpsPoints: GPSPoint[]): string {
  const startDate = new Date(activity.start_time);
  
  // Créer les points de trace pour gpx-builder - format GPX classique
  const waypoints: GPXWaypoint[] = gpsPoints.map(point => {
    const waypoint: GPXWaypoint = {
      lat: point.lat,
      lon: point.lon,
      time: point.time
    };
    
    // Ajouter l'élévation si disponible
    if (point.ele !== undefined && point.ele !== null) {
      waypoint.ele = point.ele;
    }
    
    return waypoint;
  });

  // Créer la trace avec gpx-builder - GPX classique
  const gpxData = {
    metadata: {
      name: activity.name,
      desc: 'Activité exportée depuis RedCapBeta',
      time: startDate
    },
    tracks: [
      {
        name: activity.name,
        desc: `Type: ${activity.sport_type} - Distance: ${(activity.distance / 1000).toFixed(2)} km - Durée: ${Math.floor(activity.duration / 60)}:${(activity.duration % 60).toString().padStart(2, '0')}`,
        segments: [
          {
            points: waypoints
          }
        ]
      }
    ]
  };

  // Générer le GPX classique avec gpx-builder
  return buildGPX(gpxData);
}
