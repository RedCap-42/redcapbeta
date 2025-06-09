/**
 * Utilitaire pour traiter les fichiers FIT et extraire les données d'élévation
 */

// Import correct du FIT parser
import FitParser from 'fit-file-parser';

// Types pour les données FIT
interface FitRecord {
  altitude?: number;
  [key: string]: unknown;
}

interface FitSession {
  total_ascent?: number;
  [key: string]: unknown;
}

interface FitData {
  records?: FitRecord[];
  sessions?: FitSession[];
  [key: string]: unknown;
}

/**
 * Traite un fichier FIT et calcule le dénivelé positif total
 * @param fileBuffer Le buffer du fichier FIT à traiter
 * @returns Promesse résolvant vers le dénivelé positif en mètres
 */
export async function extractElevationGain(fileBuffer: ArrayBuffer): Promise<number> {
  return new Promise((resolve, reject) => {
    try {
      // Initialiser FitParser correctement
      const fitParser = new FitParser({
        force: true,
        speedUnit: 'km/h',
        lengthUnit: 'km',
        elapsedRecordField: true,
        mode: 'list',
      });      // Utiliser l'API basée sur les événements
      fitParser.on('data', (data: FitData) => {
        try {
          // Extraire les données d'élévation des records
          let totalElevationGain = 0;
          let lastElevation: number | null = null;

          if (data.records && Array.isArray(data.records)) {
            data.records.forEach((record: FitRecord) => {
              // Si le record contient une donnée d'altitude
              if (record.altitude !== undefined) {
                if (lastElevation !== null && record.altitude > lastElevation) {
                  totalElevationGain += (record.altitude - lastElevation);
                }
                lastElevation = record.altitude;
              }
            });
          }

          // Alternative : utiliser la session summary si disponible
          if (totalElevationGain === 0 && data.sessions && data.sessions[0] && data.sessions[0].total_ascent) {
            totalElevationGain = data.sessions[0].total_ascent;
          }

          resolve(Math.round(totalElevationGain));
        } catch (err) {
          console.error('Erreur lors de l\'extraction des données d\'élévation:', err);
          reject(err);
        }
      });

      fitParser.on('error', (error: Error) => {
        console.error('Erreur lors du parsing du fichier FIT:', error);
        reject(error);
      });

      // Lancer l'analyse
      fitParser.parse(fileBuffer);
    } catch (err) {
      console.error('Erreur lors de l\'initialisation du FitParser:', err);
      reject(err);
    }
  });
}