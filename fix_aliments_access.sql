-- Solution temporaire : Désactiver RLS pour la table public_aliment
-- À exécuter dans l'interface SQL de Supabase si le problème persiste

-- Option 1 : Désactiver complètement RLS pour public_aliment (moins sécurisé)
-- ALTER TABLE public_aliment DISABLE ROW LEVEL SECURITY;

-- Option 2 : Remplacer la politique par une plus permissive
DROP POLICY IF EXISTS "Authenticated users can view public aliments" ON public_aliment;

-- Créer une politique qui permet l'accès à tous les utilisateurs authentifiés
-- en utilisant une approche différente
CREATE POLICY "Public aliments access" ON public_aliment
    FOR SELECT USING (
        -- Permettre l'accès si l'utilisateur est authentifié
        auth.uid() IS NOT NULL
        OR
        -- Ou permettre l'accès pour tous (solution temporaire)
        true
    );

-- Option 3 : Politique encore plus permissive si nécessaire
-- DROP POLICY IF EXISTS "Public aliments access" ON public_aliment;
-- CREATE POLICY "Open public aliments access" ON public_aliment
--     FOR SELECT USING (true);

-- Vérifier que la politique est bien appliquée
SELECT * FROM pg_policies WHERE tablename = 'public_aliment';
