-- Migration pour ajouter la table user_sync_status si elle n'existe pas
-- À exécuter dans l'interface Supabase

-- Créer la table user_sync_status pour suivre les synchronisations
CREATE TABLE IF NOT EXISTS public.user_sync_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    last_sync_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE public.user_sync_status ENABLE ROW LEVEL SECURITY;

-- Create policies for user_sync_status table
CREATE POLICY "Users can view their own sync status" ON public.user_sync_status
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own sync status" ON public.user_sync_status
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own sync status" ON public.user_sync_status
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

-- Trigger pour mettre à jour updated_at automatiquement
CREATE TRIGGER update_user_sync_status_updated_at 
    BEFORE UPDATE ON public.user_sync_status 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_user_sync_status_user_id ON public.user_sync_status(user_id);

-- Message de confirmation
DO $$
BEGIN
    RAISE NOTICE 'Table user_sync_status créée avec succès !';
END $$;
