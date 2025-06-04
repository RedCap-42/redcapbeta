import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { GarminConnect } from 'garmin-connect';
import fs from 'fs';
import path from 'path';
import os from 'os';
import AdmZip from 'adm-zip';
import { SupabaseClient } from '@supabase/supabase-js';

// Fonction pour extraire un fichier zip
async function extractZip(zipFilePath: string, extractToPath: string): Promise<string[]> {
  try {
    // Créer le dossier d'extraction s'il n'existe pas
    if (!fs.existsSync(extractToPath)) {
      fs.mkdirSync(extractToPath, { recursive: true });
    }

    // Utiliser AdmZip pour l'extraction
    const zip = new AdmZip(zipFilePath);
    const extractedFiles: string[] = [];

    // Extraire tous les fichiers
    zip.getEntries().forEach((entry) => {
      if (!entry.isDirectory) {
        const filePath = path.join(extractToPath, entry.entryName);
        zip.extractEntryTo(entry.entryName, extractToPath, false, true);
        extractedFiles.push(filePath);
        console.log(`Fichier extrait: ${filePath}`);
      }
    });

    return extractedFiles;
  } catch (error) {
    console.error('Erreur lors de l\'extraction du zip:', error);
    throw error;
  }
}

// Trouver un fichier .fit dans un dossier
function findFitFile(directory: string): string | null {
  try {
    const files = fs.readdirSync(directory);
    const fitFile = files.find(file => file.toLowerCase().endsWith('.fit'));
    return fitFile ? path.join(directory, fitFile) : null;
  } catch (error) {
    console.error(`Erreur lors de la recherche de fichier .fit dans ${directory}:`, error);
    return null;
  }
}

// Vérifier si une activité existe déjà en base de données
async function activityExists(supabase: SupabaseClient, userId: string, activityId: number): Promise<boolean> {
  const { data, error } = await supabase
    .from('garmin_activities')
    .select('id')
    .eq('user_id', userId)
    .eq('activity_id', activityId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Erreur lors de la vérification de l\'activité:', error);
  }

  return !!data;
}

// Supprimer un fichier s'il existe dans le bucket
async function deleteFileIfExists(supabase: SupabaseClient, bucket: string, path: string) {
  try {
    await supabase.storage.from(bucket).remove([path]);
    console.log(`Fichier existant supprimé: ${path}`);
  } catch (error) {
    // Ignorer les erreurs si le fichier n'existe pas
    console.log(`Tentative de suppression du fichier ${path}: ${error}`);
  }
}

// Définition d'un type pour les activités Garmin
type GarminActivity = {
  activityId: number;
  activityName: string;
  activityType: {
    typeKey: string;
    typeId?: number;
  };
  startTimeLocal: string;
  duration: number;
  distance: number;
  // Autres propriétés potentielles
};

export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const cookiesStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookiesStore });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Récupérer les données de la requête
    const { userId } = await request.json();

    // Vérifier que l'utilisateur est bien celui de la session
    if (userId !== session.user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    // Récupérer les identifiants Garmin de l'utilisateur
    const { data: credentials, error: credentialsError } = await supabase
      .from('garmin_credentials')
      .select('email, password_encrypted')
      .eq('user_id', userId)
      .single();

    if (credentialsError || !credentials) {
      return NextResponse.json(
        { error: 'Identifiants Garmin non trouvés' },
        { status: 404 }
      );
    }

    // Initialiser le client Garmin Connect
    const GCClient = new GarminConnect({
      username: credentials.email,
      password: credentials.password_encrypted
    });

    // Se connecter à Garmin Connect
    await GCClient.login();
    console.log('Connecté à Garmin Connect');

    // Vérifier la dernière date de synchronisation
    const { data: syncData } = await supabase
      .from('user_sync_status')
      .select('last_sync_date')
      .eq('user_id', userId)
      .single();

    // Utilisation optionnelle de syncData si nécessaire
    console.log('Dernière synchronisation:', syncData?.last_sync_date || 'Jamais');

    let activityOffset = 0;
    const pageSize = 20; // Nombre d'activités par page
    let allActivities: GarminActivity[] = [];
    let hasMore = true;
    const runningActivityTypes = ['running', 'trail_running', 'treadmill_running', 'track_running', 'indoor_running', 'virtual_run'];

    // Limiter le nombre de pages pour éviter de surcharger l'API
    const maxPages = 10; // Maximum 200 activités (10 pages * 20 activités)
    let currentPage = 0;

    try {
      while (hasMore && currentPage < maxPages) {
        // Récupérer les activités par lot
        const activitiesBatch = await GCClient.getActivities(activityOffset, pageSize);

        if (activitiesBatch.length === 0) {
          // Plus d'activités disponibles
          hasMore = false;
        } else {
          // Filtrer uniquement les activités de course à pied
          const runningActivities = activitiesBatch.filter(activity => {
            // Vérifier la structure de l'activité et son type
            if (!activity.activityType || typeof activity.activityType !== 'object') {
              console.log('Structure d\'activité inattendue:', activity);
              return false;
            }

            // Si activityType est un objet, utiliser activityType.typeKey pour le type
            if (activity.activityType.typeKey) {
              return runningActivityTypes.includes(activity.activityType.typeKey.toLowerCase());
            }

            // Alternative: vérifier activityType.typeId ou utiliser une autre propriété si nécessaire
            return false;
          });

          console.log(`Lot d'activités: ${activitiesBatch.length}, activités de course filtrées: ${runningActivities.length}`);
          allActivities = [...allActivities, ...runningActivities];
          activityOffset += pageSize;
          currentPage++;

          // Petite pause pour ne pas surcharger l'API
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des activités:', error);
      return NextResponse.json(
        { error: "Erreur lors de la récupération des activités Garmin" },
        { status: 500 }
      );
    }

    console.log(`${allActivities.length} activités de course récupérées`);

    // Mise à jour de la date de dernière synchronisation
    const now = new Date().toISOString();
    await supabase
      .from('user_sync_status')
      .upsert({ user_id: userId, last_sync_date: now })
      .select()
      .single();

    // Vérifier si des activités existent déjà dans la base de données
    const { data: existingActivities } = await supabase
      .from('garmin_activities')
      .select('activity_id')
      .eq('user_id', userId);

    const existingActivityIds = existingActivities?.map(a => a.activity_id) || [];
    const newActivities = allActivities.filter(activity => !existingActivityIds.includes(activity.activityId));

    console.log(`${newActivities.length} nouvelles activités à télécharger`);

    if (newActivities.length === 0) {
      return NextResponse.json({
        message: 'Aucune nouvelle activité à télécharger',
        newActivities: 0
      });
    }

    // Créer un dossier temporaire pour stocker les fichiers
    const tempDir = path.join(os.tmpdir(), 'garmin-activities');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Nombre d'activités traitées avec succès
    let processedActivities = 0;

    // Télécharger et traiter chaque nouvelle activité
    for (const activity of newActivities) {
      try {
        console.log(`Traitement de l'activité ${activity.activityId}...`);

        // Créer un dossier d'extraction spécifique pour cette activité
        const activityDir = path.join(tempDir, activity.activityId.toString());
        if (!fs.existsSync(activityDir)) {
          fs.mkdirSync(activityDir, { recursive: true });
        }

        console.log(`Téléchargement du fichier d'activité ${activity.activityId}...`);

        // Télécharger directement le fichier original de l'activité (ZIP contenant le FIT)
        await GCClient.downloadOriginalActivityData(activity, activityDir);
        console.log(`Fichier d'activité téléchargé dans ${activityDir}`);

        // Rechercher le fichier ZIP téléchargé (le nom sera fourni par Garmin)
        const files = fs.readdirSync(activityDir);
        const zipFile = files.find(file => file.toLowerCase().endsWith('.zip'));

        if (!zipFile) {
          throw new Error(`Aucun fichier ZIP trouvé pour l'activité ${activity.activityId}`);
        }

        const zipFilePath = path.join(activityDir, zipFile);
        console.log(`Fichier ZIP trouvé: ${zipFilePath}`);

        // Extraire le fichier ZIP
        const extractDir = path.join(activityDir, 'extracted');
        console.log(`Extraction du fichier ZIP pour l'activité ${activity.activityId}...`);
        const extractedFiles = await extractZip(zipFilePath, extractDir);
        console.log(`Fichiers extraits: ${extractedFiles.length}`);

        // Trouver le fichier .fit dans le dossier d'extraction
        const fitFilePath = findFitFile(extractDir);
        if (!fitFilePath) {
          throw new Error(`Aucun fichier .fit trouvé pour l'activité ${activity.activityId}`);
        }
        console.log(`Fichier FIT trouvé: ${fitFilePath}`);

        // Créer le dossier utilisateur dans le bucket s'il n'existe pas
        const userFolderPath = `${userId}`;
        const { data: userFolder } = await supabase
          .storage
          .from('database')
          .list(userFolderPath);

        if (!userFolder) {
          // Le dossier n'existe pas, on le crée en uploadant un fichier vide
          const { error: uploadError } = await supabase
            .storage
            .from('database')
            .upload(`${userFolderPath}/.keep`, new Blob([]));

          if (uploadError && uploadError.message !== 'The resource already exists') {
            console.error('Erreur lors de la création du dossier utilisateur:', uploadError);
          }
        }

        // Vérifier si l'activité existe déjà dans la base de données
        const isActivityExisting = await activityExists(supabase, userId, activity.activityId);

        // Chemin de stockage pour le fichier FIT
        const fitStoragePath = `${userFolderPath}/${activity.activityId}.fit`;

        // Si l'activité existe déjà, supprimer le fichier existant dans le bucket
        if (isActivityExisting) {
          await deleteFileIfExists(supabase, 'database', fitStoragePath);
        }

        // Uploader le fichier FIT dans le bucket
        // Utiliser upsert (supprimer et remplacer si existe déjà)
        const { error: fitUploadError } = await supabase
          .storage
          .from('database')
          .upload(fitStoragePath, fs.readFileSync(fitFilePath), {
            upsert: true // Remplacer si le fichier existe déjà
          });

        if (fitUploadError) {
          console.error('Erreur lors de l\'upload du fichier FIT:', fitUploadError);
        } else {
          console.log(`Fichier FIT uploadé: ${fitStoragePath}`);
        }

        // Enregistrer ou mettre à jour l'activité dans la base de données
        if (isActivityExisting) {
          // Mettre à jour l'activité existante
          const { error: updateError } = await supabase
            .from('garmin_activities')
            .update({
              activity_name: activity.activityName,
              activity_type: activity.activityType.typeKey,
              start_time: activity.startTimeLocal,
              duration: activity.duration,
              distance: activity.distance,
              fit_file_path: fitStoragePath
            })
            .eq('user_id', userId)
            .eq('activity_id', activity.activityId);

          if (updateError) {
            console.error('Erreur lors de la mise à jour de l\'activité:', updateError);
          } else {
            console.log(`Activité ${activity.activityId} mise à jour avec succès`);
            processedActivities++;
          }
        } else {
          // Insérer une nouvelle activité
          const { error: insertError } = await supabase
            .from('garmin_activities')
            .insert({
              user_id: userId,
              activity_id: activity.activityId,
              activity_name: activity.activityName,
              activity_type: activity.activityType.typeKey,
              start_time: activity.startTimeLocal,
              duration: activity.duration,
              distance: activity.distance,
              fit_file_path: fitStoragePath
            });

          if (insertError) {
            console.error('Erreur lors de l\'enregistrement de l\'activité:', insertError);
          } else {
            console.log(`Activité ${activity.activityId} enregistrée avec succès`);
            processedActivities++;
          }
        }
      } catch (error) {
        console.error(`Erreur lors du traitement de l'activité ${activity.activityId}:`, error);
      }
    }

    // Nettoyer les fichiers temporaires
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
      console.log(`Dossier temporaire supprimé: ${tempDir}`);
    } catch (error) {
      console.error(`Erreur lors de la suppression du dossier temporaire: ${error}`);
    }

    return NextResponse.json({
      message: 'Activités téléchargées avec succès',
      newActivities: processedActivities
    });
  } catch (error: unknown) {
    console.error('Erreur lors de la synchronisation avec Garmin:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la synchronisation avec Garmin Connect';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
