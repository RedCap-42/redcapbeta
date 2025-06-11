-- Migration pour ajouter la table des chaussures
-- Créé le 2025-06-09

-- Table pour stocker les chaussures des utilisateurs
CREATE TABLE IF NOT EXISTS public.shoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    kilometers NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.shoes ENABLE ROW LEVEL SECURITY;

-- Create policies for shoes table
CREATE POLICY "Users can view their own shoes" ON public.shoes
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own shoes" ON public.shoes
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own shoes" ON public.shoes
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own shoes" ON public.shoes
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_shoes_updated_at 
    BEFORE UPDATE ON public.shoes 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
