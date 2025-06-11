-- Ajouter la colonne shoes à la table garmin_activities
ALTER TABLE public.garmin_activities 
ADD COLUMN shoes UUID REFERENCES public.shoes(id) ON DELETE SET NULL;

-- Créer un index pour améliorer les performances des requêtes
CREATE INDEX IF NOT EXISTS idx_garmin_activities_shoes ON public.garmin_activities(shoes);

-- Mettre à jour les politiques RLS pour inclure la nouvelle colonne
-- Les politiques existantes couvrent déjà cette colonne car elles utilisent user_id
