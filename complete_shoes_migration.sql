-- Script de migration complet pour la nouvelle structure des kilomètres

-- Étape 1: Sauvegarder les données existantes (optionnel, au cas où on souhaiterait revenir en arrière)
-- CREATE TABLE shoes_backup AS SELECT * FROM public.shoes;

-- Étape 2: Ajouter les nouvelles colonnes
ALTER TABLE public.shoes 
ADD COLUMN IF NOT EXISTS manual_kilometers NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS auto_kilometers NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_kilometers NUMERIC GENERATED ALWAYS AS (manual_kilometers + auto_kilometers) STORED;

-- Étape 3: Migrer les données existantes vers manual_kilometers
UPDATE public.shoes 
SET manual_kilometers = COALESCE(kilometers, 0)
WHERE manual_kilometers = 0 AND kilometers IS NOT NULL;

-- Étape 4: Supprimer l'ancienne colonne kilometers
ALTER TABLE public.shoes DROP COLUMN IF EXISTS kilometers;

-- Étape 5: Ajouter des contraintes pour s'assurer que les valeurs sont positives
ALTER TABLE public.shoes 
ADD CONSTRAINT IF NOT EXISTS check_manual_kilometers_positive CHECK (manual_kilometers >= 0),
ADD CONSTRAINT IF NOT EXISTS check_auto_kilometers_positive CHECK (auto_kilometers >= 0);

-- Étape 6: Créer des index pour les performances
CREATE INDEX IF NOT EXISTS idx_shoes_total_kilometers ON public.shoes(total_kilometers);
CREATE INDEX IF NOT EXISTS idx_shoes_manual_kilometers ON public.shoes(manual_kilometers);
CREATE INDEX IF NOT EXISTS idx_shoes_auto_kilometers ON public.shoes(auto_kilometers);

-- Étape 7: Vérifier que la migration s'est bien passée
-- SELECT 
--   id, 
--   name, 
--   manual_kilometers, 
--   auto_kilometers, 
--   total_kilometers 
-- FROM public.shoes 
-- LIMIT 5;
