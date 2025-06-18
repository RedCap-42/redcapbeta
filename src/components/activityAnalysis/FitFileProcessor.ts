import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export interface PaceDataPoint {
  distance: number;
  pace: number;
  speed: number;
}

export interface AltitudeDataPoint {
  distance: number;
  altitude: number;
}

export interface HeartRateDataPoint {
  distance: number;
  heartRate: number;
}

export interface FitFileData {
  paceData: PaceDataPoint[];
  altitudeData: AltitudeDataPoint[];
  heartRateData: HeartRateDataPoint[];
}

interface Activity {
  activity_id: string | number;
  fit_file_path?: string;
  name: string;
}

interface User {
  id: string;
}

interface FitRecord {
  speed?: number;
  distance?: number;
  timestamp?: Date;
  enhanced_speed?: number;
  enhanced_distance?: number;
  altitude?: number;
  enhanced_altitude?: number;
  heart_rate?: number;
  enhanced_heart_rate?: number;
  [key: string]: unknown;
}

interface FitData {
  records?: FitRecord[];
  sessions?: Array<{ [key: string]: unknown }>;
  [key: string]: unknown;
}

export class FitFileProcessor {
  private supabase;

  constructor() {
    this.supabase = createClientComponentClient();
  }

  async loadFitFileData(user: User, activity: Activity): Promise<FitFileData> {
    console.log(`Activité: ${activity.name}, ID: ${activity.activity_id}`);
    console.log(`Tentative de téléchargement du fichier FIT avec chemin: ${activity.fit_file_path}`);

    // Essayer plusieurs chemins possibles dans l'ordre de priorité
    const pathsToTry = [
      activity.fit_file_path ? activity.fit_file_path : null,
      `${user.id}/fitFiles/${activity.activity_id}.fit`,
      `${user.id}/${activity.activity_id}.fit`,
      `${user.id}/files/${activity.activity_id}.fit`,
      `${user.id}/activities/${activity.activity_id}.fit`,
    ].filter(Boolean) as string[];

    console.log(`Tentative avec ${pathsToTry.length} chemins possibles:`, pathsToTry);

    let fitData: Blob | null = null;
    let usedPath: string | null = null;
    const allErrors: string[] = [];

    // Essayer chaque chemin jusqu'à ce qu'un fonctionne
    for (const path of pathsToTry) {
      console.log(`Essai avec le chemin: ${path}`);
      try {
        const { data, error: downloadError } = await this.supabase
          .storage
          .from('database')
          .download(path);

        if (!downloadError && data) {
          fitData = data;
          usedPath = path;
          console.log(`Fichier FIT trouvé avec le chemin: ${path}, taille: ${data.size} bytes`);
          break;
        } else {
          console.log(`Échec avec le chemin ${path}:`, downloadError?.message);
          allErrors.push(`${path}: ${downloadError?.message}`);
        }
      } catch (downloadErr) {
        console.error(`Erreur lors du téléchargement avec le chemin ${path}:`, downloadErr);
        allErrors.push(`${path}: ${downloadErr instanceof Error ? downloadErr.message : 'Erreur inconnue'}`);
      }
    }

    // Si aucun chemin n'a fonctionné
    if (!fitData) {
      console.error('Tous les chemins ont échoué:', allErrors);
      throw new Error(`Impossible de télécharger le fichier FIT après ${pathsToTry.length} tentatives.`);
    }

    console.log(`Analyse du fichier FIT récupéré via le chemin: ${usedPath}`);

    return this.processFitFile(fitData);
  }

  private async processFitFile(fitData: Blob): Promise<FitFileData> {
    const { default: FitParser } = await import('fit-file-parser');
    
    console.log('Début du traitement du fichier FIT, taille:', fitData.size, 'bytes');
    
    try {
      // Convertir le Blob en ArrayBuffer pour certains parseurs
      const arrayBuffer = await fitData.arrayBuffer();
      console.log('Conversion en ArrayBuffer réussie, taille:', arrayBuffer.byteLength, 'bytes');
      
      return new Promise((resolve, reject) => {
        const fitParser = new FitParser({
          force: true,
          speedUnit: 'm/s',
          lengthUnit: 'm',
          elapsedRecordField: true,
          mode: 'list',
        });

        console.log('Configuration du parser FIT pour correspondre au code fourni');

        // Utiliser un cast de type pour indiquer à TypeScript que parse peut accepter un callback
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
              const fitFileData = this.processRecords(data);
              resolve(fitFileData);
            } catch (err) {
              console.error('Erreur lors de l\'extraction des données:', err);
              reject(new Error('Erreur lors du traitement des données'));
            }
          }
        );
      });
    } catch (err) {
      console.error('Erreur lors de la conversion en ArrayBuffer:', err);
      throw new Error('Erreur lors de la préparation du fichier FIT');
    }
  }

  private processRecords(data: FitData): FitFileData {
    const pacePoints: PaceDataPoint[] = [];
    const altitudePoints: AltitudeDataPoint[] = [];
    const heartRatePoints: HeartRateDataPoint[] = [];

    // Extraire les données de records pour calculer l'allure et l'altitude
    let lastDistance = 0;
    let lastTimestamp: Date | null = null;

    if (data.records && Array.isArray(data.records)) {
      console.log(`Nombre de records trouvés: ${data.records.length}`);
      
      data.records.forEach((record: FitRecord, index: number) => {
        // Priorité aux données enhanced, sinon utiliser les données standard
        const speed = record.enhanced_speed || record.speed;
        const distance = record.enhanced_distance || record.distance;
        const altitude = record.enhanced_altitude || record.altitude;
        const heartRate = record.enhanced_heart_rate || record.heart_rate;
        const timestamp = record.timestamp;

        // Méthode 1: Utiliser la distance cumulée si disponible
        if (distance !== undefined && distance > 0) {
          const distanceInKm = distance / 1000;
          
          // Calculer l'allure basée sur la vitesse instantanée
          if (speed !== undefined && speed > 0) {
            const paceInSecondsPerKm = 1000 / speed;
            
            // Filtrer les valeurs aberrantes (allure trop lente ou trop rapide)
            if (paceInSecondsPerKm > 0 && paceInSecondsPerKm < 1800) { // Entre 0 et 30 min/km
              pacePoints.push({
                distance: distanceInKm,
                pace: paceInSecondsPerKm,
                speed: speed
              });
            }
          }

          // Ajouter les données d'altitude si disponibles
          if (altitude !== undefined) {
            altitudePoints.push({
              distance: distanceInKm,
              altitude: altitude
            });
          }

          // Ajouter les données de fréquence cardiaque si disponibles
          if (heartRate !== undefined && heartRate > 0 && heartRate < 250) {
            heartRatePoints.push({
              distance: distanceInKm,
              heartRate: heartRate
            });
          }
          
          lastDistance = distance;
        } 
        // Méthode 2: Utiliser la vitesse pour estimer la distance
        else if (speed !== undefined && speed > 0 && index > 0) {
          // Estimer l'intervalle de temps (généralement 1 seconde)
          let timeInterval = 1; // Par défaut 1 seconde
          
          if (timestamp && lastTimestamp) {
            timeInterval = (timestamp.getTime() - lastTimestamp.getTime()) / 1000;
          }
          
          // Calculer la distance parcourue dans cet intervalle
          const distanceDelta = speed * timeInterval;
          lastDistance += distanceDelta;
          
          const distanceInKm = lastDistance / 1000;
          const paceInSecondsPerKm = 1000 / speed;
          
          // Filtrer les valeurs aberrantes
          if (paceInSecondsPerKm > 0 && paceInSecondsPerKm < 1800) {
            pacePoints.push({
              distance: distanceInKm,
              pace: paceInSecondsPerKm,
              speed: speed
            });
          }

          // Ajouter les données d'altitude si disponibles
          if (altitude !== undefined) {
            altitudePoints.push({
              distance: distanceInKm,
              altitude: altitude
            });
          }

          // Ajouter les données de fréquence cardiaque si disponibles
          if (heartRate !== undefined && heartRate > 0 && heartRate < 250) {
            heartRatePoints.push({
              distance: distanceInKm,
              heartRate: heartRate
            });
          }
        }
        
        if (timestamp) {
          lastTimestamp = timestamp;
        }
      });
    }

    console.log(`Points d'allure extraits: ${pacePoints.length}`);
    console.log(`Points d'altitude extraits: ${altitudePoints.length}`);
    console.log(`Points de fréquence cardiaque extraits: ${heartRatePoints.length}`);

    return {
      paceData: pacePoints,
      altitudeData: altitudePoints,
      heartRateData: heartRatePoints
    };
  }
}
