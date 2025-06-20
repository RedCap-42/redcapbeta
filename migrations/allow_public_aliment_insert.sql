-- Migration pour permettre l'ajout d'aliments publics par les utilisateurs authentifiés
-- Cette migration ajoute les permissions d'insertion pour la table public_aliment

-- 1. Politique pour permettre aux utilisateurs authentifiés d'insérer des aliments publics
CREATE POLICY "Authenticated users can insert public aliments" ON public_aliment
    FOR INSERT 
    WITH CHECK (auth.uid() IS NOT NULL);

-- 2. Optionnel : Politique pour permettre aux utilisateurs de modifier leurs propres aliments publics
-- (Si vous voulez traquer qui a ajouté quoi, vous devriez ajouter une colonne created_by)
-- CREATE POLICY "Users can update public aliments they created" ON public_aliment
--     FOR UPDATE
--     USING (auth.uid() IS NOT NULL);

-- 3. Optionnel : Politique pour permettre aux utilisateurs de supprimer des aliments publics
-- (Décommentez si vous voulez permettre la suppression)
-- CREATE POLICY "Authenticated users can delete public aliments" ON public_aliment
--     FOR DELETE
--     USING (auth.uid() IS NOT NULL);

-- Vérifier que toutes les politiques sont en place
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'public_aliment'
ORDER BY cmd;
