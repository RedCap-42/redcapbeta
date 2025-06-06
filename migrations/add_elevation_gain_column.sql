-- Migration pour ajouter la colonne elevation_gain à la table garmin_activities
ALTER TABLE garmin_activities
ADD COLUMN IF NOT EXISTS elevation_gain NUMERIC DEFAULT 0;

-- Commentaire sur la colonne
COMMENT ON COLUMN garmin_activities.elevation_gain IS 'Dénivelé positif en mètres pour l''activité';
