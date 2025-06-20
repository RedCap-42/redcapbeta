-- Table pour les dossiers de chaussures
CREATE TABLE IF NOT EXISTS shoes_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#3B82F6', -- Couleur hex pour le dossier
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, name) -- Un utilisateur ne peut pas avoir deux dossiers avec le même nom
);

-- Table de liaison entre chaussures et dossiers
CREATE TABLE IF NOT EXISTS shoes_folder_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    folder_id UUID NOT NULL REFERENCES shoes_folders(id) ON DELETE CASCADE,
    shoe_id UUID NOT NULL REFERENCES shoes(id) ON DELETE CASCADE,
    order_position INTEGER DEFAULT 0, -- Pour permettre le tri dans le dossier
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(folder_id, shoe_id) -- Une chaussure ne peut être que dans un seul dossier à la fois
);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_shoes_folders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_shoes_folders_updated_at
    BEFORE UPDATE ON shoes_folders
    FOR EACH ROW
    EXECUTE FUNCTION update_shoes_folders_updated_at();

-- Index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_shoes_folders_user_id ON shoes_folders(user_id);
CREATE INDEX IF NOT EXISTS idx_shoes_folder_items_user_id ON shoes_folder_items(user_id);
CREATE INDEX IF NOT EXISTS idx_shoes_folder_items_folder_id ON shoes_folder_items(folder_id);
CREATE INDEX IF NOT EXISTS idx_shoes_folder_items_shoe_id ON shoes_folder_items(shoe_id);

-- RLS (Row Level Security) pour shoes_folders
ALTER TABLE shoes_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own shoes folders" ON shoes_folders
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own shoes folders" ON shoes_folders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own shoes folders" ON shoes_folders
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own shoes folders" ON shoes_folders
    FOR DELETE USING (auth.uid() = user_id);

-- RLS pour shoes_folder_items
ALTER TABLE shoes_folder_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own shoes folder items" ON shoes_folder_items
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own shoes folder items" ON shoes_folder_items
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own shoes folder items" ON shoes_folder_items
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own shoes folder items" ON shoes_folder_items
    FOR DELETE USING (auth.uid() = user_id);
