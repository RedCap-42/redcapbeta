-- Migration complète pour le système de kilomètres manuels
-- À exécuter dans l'interface Supabase

-- 1. Créer la table manual_km
CREATE TABLE IF NOT EXISTS public.manual_km (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    shoe_id UUID NOT NULL REFERENCES public.shoes(id) ON DELETE CASCADE,
    kilometers NUMERIC NOT NULL CHECK (kilometers > 0),
    title TEXT NOT NULL,
    description TEXT,
    activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable Row Level Security
ALTER TABLE public.manual_km ENABLE ROW LEVEL SECURITY;

-- 3. Create policies for manual_km table
CREATE POLICY "Users can view their own manual km entries" ON public.manual_km
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own manual km entries" ON public.manual_km
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own manual km entries" ON public.manual_km
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own manual km entries" ON public.manual_km
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- 4. Créer la fonction pour mettre à jour updated_at (si elle n'existe pas déjà)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Trigger pour mettre à jour updated_at automatiquement
CREATE TRIGGER update_manual_km_updated_at 
    BEFORE UPDATE ON public.manual_km 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 6. Fonction pour calculer les kilomètres manuels d'une chaussure
CREATE OR REPLACE FUNCTION calculate_manual_kilometers(shoe_uuid UUID)
RETURNS NUMERIC AS $$
DECLARE
    total_manual_km NUMERIC;
BEGIN
    SELECT COALESCE(SUM(kilometers), 0)
    INTO total_manual_km
    FROM public.manual_km
    WHERE shoe_id = shoe_uuid;
    
    RETURN total_manual_km;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Fonction trigger pour mettre à jour automatiquement manual_kilometers dans shoes
CREATE OR REPLACE FUNCTION update_shoe_manual_kilometers()
RETURNS TRIGGER AS $$
BEGIN
    -- Mettre à jour la chaussure concernée
    UPDATE public.shoes 
    SET manual_kilometers = calculate_manual_kilometers(
        CASE 
            WHEN TG_OP = 'DELETE' THEN OLD.shoe_id
            ELSE NEW.shoe_id
        END
    )
    WHERE id = CASE 
        WHEN TG_OP = 'DELETE' THEN OLD.shoe_id
        ELSE NEW.shoe_id
    END;
    
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Triggers pour maintenir la cohérence des kilomètres manuels
DROP TRIGGER IF EXISTS trigger_update_shoe_manual_km_insert ON public.manual_km;
DROP TRIGGER IF EXISTS trigger_update_shoe_manual_km_update ON public.manual_km;
DROP TRIGGER IF EXISTS trigger_update_shoe_manual_km_delete ON public.manual_km;

CREATE TRIGGER trigger_update_shoe_manual_km_insert
    AFTER INSERT ON public.manual_km
    FOR EACH ROW
    EXECUTE FUNCTION update_shoe_manual_kilometers();

CREATE TRIGGER trigger_update_shoe_manual_km_update
    AFTER UPDATE ON public.manual_km
    FOR EACH ROW
    EXECUTE FUNCTION update_shoe_manual_kilometers();

CREATE TRIGGER trigger_update_shoe_manual_km_delete
    AFTER DELETE ON public.manual_km
    FOR EACH ROW
    EXECUTE FUNCTION update_shoe_manual_kilometers();

-- 9. Index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_manual_km_shoe_id ON public.manual_km(shoe_id);
CREATE INDEX IF NOT EXISTS idx_manual_km_user_id ON public.manual_km(user_id);
CREATE INDEX IF NOT EXISTS idx_manual_km_activity_date ON public.manual_km(activity_date);

-- 10. Mettre à jour les données existantes (recalculer manual_kilometers pour toutes les chaussures)
UPDATE public.shoes 
SET manual_kilometers = calculate_manual_kilometers(id)
WHERE id IN (SELECT DISTINCT id FROM public.shoes);

-- Afficher un message de confirmation
DO $$
BEGIN
    RAISE NOTICE 'Migration manual_km terminée avec succès !';
    RAISE NOTICE 'Table manual_km créée avec les triggers automatiques';
    RAISE NOTICE 'Toutes les chaussures existantes ont été mises à jour';
END $$;
