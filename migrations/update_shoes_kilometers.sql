-- Migration pour modifier la structure des kilomètres dans la table shoes
-- Supprime l'ancienne colonne kilometers et ajoute les nouvelles colonnes

-- Étape 1: Ajouter les nouvelles colonnes
ALTER TABLE public.shoes 
ADD COLUMN manual_kilometers NUMERIC DEFAULT 0,
ADD COLUMN auto_kilometers NUMERIC DEFAULT 0,
ADD COLUMN total_kilometers NUMERIC GENERATED ALWAYS AS (manual_kilometers + auto_kilometers) STORED;

-- Étape 2: Migrer les données existantes (si la colonne kilometers existe)
-- Mettre toutes les valeurs existantes dans manual_kilometers
UPDATE public.shoes 
SET manual_kilometers = COALESCE(kilometers, 0)
WHERE kilometers IS NOT NULL;

-- Étape 3: Supprimer l'ancienne colonne kilometers
ALTER TABLE public.shoes DROP COLUMN IF EXISTS kilometers;

-- Étape 4: Ajouter des contraintes pour s'assurer que les valeurs sont positives
ALTER TABLE public.shoes 
ADD CONSTRAINT check_manual_kilometers_positive CHECK (manual_kilometers >= 0),
ADD CONSTRAINT check_auto_kilometers_positive CHECK (auto_kilometers >= 0);

-- Étape 5: Créer des index pour les performances
CREATE INDEX IF NOT EXISTS idx_shoes_total_kilometers ON public.shoes(total_kilometers);
CREATE INDEX IF NOT EXISTS idx_shoes_manual_kilometers ON public.shoes(manual_kilometers);
CREATE INDEX IF NOT EXISTS idx_shoes_auto_kilometers ON public.shoes(auto_kilometers);
