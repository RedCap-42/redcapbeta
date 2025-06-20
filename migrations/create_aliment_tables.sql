-- Table pour les aliments privés (spécifiques à l'utilisateur)
CREATE TABLE IF NOT EXISTS private_aliment (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    nom VARCHAR(255) NOT NULL,
    calories_kcal DECIMAL(8,2), -- Calories pour 100g
    proteines_g DECIMAL(8,2), -- Protéines en grammes pour 100g
    glucides_g DECIMAL(8,2), -- Glucides en grammes pour 100g
    dont_sucres_g DECIMAL(8,2), -- Sucres en grammes pour 100g
    lipides_g DECIMAL(8,2), -- Lipides en grammes pour 100g
    dont_satures_g DECIMAL(8,2), -- Graisses saturées en grammes pour 100g
    fibres_g DECIMAL(8,2), -- Fibres en grammes pour 100g
    sel_sodium_g DECIMAL(8,2), -- Sel/sodium en grammes pour 100g
    micronutriments_principaux TEXT, -- JSON ou texte libre pour les micronutriments
    type_aliment VARCHAR(100), -- Type d'aliment (fruit, légume, viande, etc.)
    vitamines TEXT, -- JSON ou texte libre pour les vitamines
    note_supplementaire TEXT, -- Notes supplémentaires
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table pour les aliments publics (partagés entre tous les utilisateurs)
CREATE TABLE IF NOT EXISTS public_aliment (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(255) NOT NULL,
    calories_kcal DECIMAL(8,2), -- Calories pour 100g
    proteines_g DECIMAL(8,2), -- Protéines en grammes pour 100g
    glucides_g DECIMAL(8,2), -- Glucides en grammes pour 100g
    dont_sucres_g DECIMAL(8,2), -- Sucres en grammes pour 100g
    lipides_g DECIMAL(8,2), -- Lipides en grammes pour 100g
    dont_satures_g DECIMAL(8,2), -- Graisses saturées en grammes pour 100g
    fibres_g DECIMAL(8,2), -- Fibres en grammes pour 100g
    sel_sodium_g DECIMAL(8,2), -- Sel/sodium en grammes pour 100g
    micronutriments_principaux TEXT, -- JSON ou texte libre pour les micronutriments
    type_aliment VARCHAR(100), -- Type d'aliment (fruit, légume, viande, etc.)
    vitamines TEXT, -- JSON ou texte libre pour les vitamines
    note_supplementaire TEXT, -- Notes supplémentaires
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_private_aliment_user_id ON private_aliment(user_id);
CREATE INDEX IF NOT EXISTS idx_private_aliment_nom ON private_aliment(nom);
CREATE INDEX IF NOT EXISTS idx_public_aliment_nom ON public_aliment(nom);
CREATE INDEX IF NOT EXISTS idx_private_aliment_type ON private_aliment(type_aliment);
CREATE INDEX IF NOT EXISTS idx_public_aliment_type ON public_aliment(type_aliment);

-- Politique de sécurité RLS (Row Level Security) pour la table privée
ALTER TABLE private_aliment ENABLE ROW LEVEL SECURITY;

-- Politique pour que les utilisateurs ne voient que leurs propres aliments privés
CREATE POLICY "Users can view their own private aliments" ON private_aliment
    FOR SELECT USING (auth.uid() = user_id);

-- Politique pour que les utilisateurs ne puissent insérer que leurs propres aliments privés
CREATE POLICY "Users can insert their own private aliments" ON private_aliment
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Politique pour que les utilisateurs ne puissent modifier que leurs propres aliments privés
CREATE POLICY "Users can update their own private aliments" ON private_aliment
    FOR UPDATE USING (auth.uid() = user_id);

-- Politique pour que les utilisateurs ne puissent supprimer que leurs propres aliments privés
CREATE POLICY "Users can delete their own private aliments" ON private_aliment
    FOR DELETE USING (auth.uid() = user_id);

-- Politique de sécurité pour la table publique (lecture seule pour tous)
ALTER TABLE public_aliment ENABLE ROW LEVEL SECURITY;

-- Tous les utilisateurs authentifiés peuvent lire les aliments publics
CREATE POLICY "Authenticated users can view public aliments" ON public_aliment
    FOR SELECT USING (auth.role() = 'authenticated');

-- Seuls les administrateurs peuvent modifier les aliments publics (optionnel)
-- CREATE POLICY "Admins can manage public aliments" ON public_aliment
--     FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Trigger pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_private_aliment_updated_at 
    BEFORE UPDATE ON private_aliment 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_public_aliment_updated_at 
    BEFORE UPDATE ON public_aliment 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
