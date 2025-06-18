-- Requête pour vérifier les données d'activités et diagnostiquer le problème d'user_id
-- Exécutez ces requêtes dans l'interface Supabase pour diagnostiquer

-- 1. Compter le nombre total d'activités
SELECT COUNT(*) as total_activities FROM garmin_activities;

-- 2. Voir tous les user_ids distincts dans la table
SELECT DISTINCT user_id, COUNT(*) as activities_count 
FROM garmin_activities 
GROUP BY user_id;

-- 3. Vérifier les types de données des colonnes duration et start_time
SELECT 
  user_id,
  activity_name,
  duration,
  start_time,
  EXTRACT(EPOCH FROM INTERVAL '1 second' * duration) as duration_in_seconds,
  duration / 3600.0 as duration_in_hours
FROM garmin_activities 
LIMIT 5;

-- 4. Vérifier les activités de l'année en cours POUR TOUS LES UTILISATEURS
SELECT 
  user_id,
  DATE(start_time) as activity_date,
  COUNT(*) as activities_count,
  SUM(duration) as total_duration_seconds,
  SUM(duration) / 3600.0 as total_duration_hours
FROM garmin_activities 
WHERE EXTRACT(YEAR FROM start_time) = EXTRACT(YEAR FROM CURRENT_DATE)
GROUP BY user_id, DATE(start_time)
ORDER BY activity_date DESC
LIMIT 10;

-- 5. Vérifier les données par mois POUR TOUS LES UTILISATEURS
SELECT 
  user_id,
  EXTRACT(MONTH FROM start_time) as month,
  EXTRACT(YEAR FROM start_time) as year,
  COUNT(*) as activities_count,
  SUM(duration) as total_duration_seconds,
  SUM(duration) / 3600.0 as total_duration_hours
FROM garmin_activities 
WHERE EXTRACT(YEAR FROM start_time) = EXTRACT(YEAR FROM CURRENT_DATE)
GROUP BY user_id, EXTRACT(MONTH FROM start_time), EXTRACT(YEAR FROM start_time)
ORDER BY user_id, month;

-- 6. Vérifier s'il y a des activités pour l'utilisateur connecté spécifiquement
-- Remplacez 'USER_ID_HERE' par l'ID de l'utilisateur connecté: e33c5c59-37b4-479e-aa04-ac087af8a989
SELECT COUNT(*) as user_activities_count 
FROM garmin_activities 
WHERE user_id = 'e33c5c59-37b4-479e-aa04-ac087af8a989';
