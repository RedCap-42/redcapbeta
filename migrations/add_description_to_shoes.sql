-- Migration pour ajouter la colonne description à la table shoes
-- Créé le 2025-06-09

-- Ajouter la colonne description à la table shoes existante
ALTER TABLE public.shoes 
ADD COLUMN IF NOT EXISTS description TEXT;
