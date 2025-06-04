-- Création de la table garmin_credentials pour stocker les identifiants Garmin
CREATE TABLE IF NOT EXISTS garmin_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  password_encrypted TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Création de la table garmin_activities pour stocker les activités
CREATE TABLE IF NOT EXISTS garmin_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_id BIGINT NOT NULL,
  activity_name TEXT,
  activity_type TEXT,
  start_time TIMESTAMP WITH TIME ZONE,
  duration FLOAT,
  distance FLOAT,
  fit_file_path TEXT,
  gpx_file_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, activity_id)
);

-- Ajout des politiques RLS pour la sécurité
ALTER TABLE garmin_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE garmin_activities ENABLE ROW LEVEL SECURITY;

-- Politiques permettant aux utilisateurs de voir uniquement leurs propres données
CREATE POLICY "Users can only view their own credentials"
  ON garmin_credentials
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only view their own activities"
  ON garmin_activities
  FOR SELECT
  USING (auth.uid() = user_id);

-- Politiques permettant aux utilisateurs d'insérer uniquement leurs propres données
CREATE POLICY "Users can only insert their own credentials"
  ON garmin_credentials
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own activities"
  ON garmin_activities
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Politiques permettant aux utilisateurs de mettre à jour uniquement leurs propres données
CREATE POLICY "Users can only update their own credentials"
  ON garmin_credentials
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only update their own activities"
  ON garmin_activities
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Politiques permettant aux utilisateurs de supprimer uniquement leurs propres données
CREATE POLICY "Users can only delete their own credentials"
  ON garmin_credentials
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only delete their own activities"
  ON garmin_activities
  FOR DELETE
  USING (auth.uid() = user_id);
