-- Correction de la politique RLS pour les aliments publics
-- Cette migration corrige le problème d'affichage des aliments publics

-- 1. Supprimer la politique existante qui ne fonctionne pas
DROP POLICY IF EXISTS "Authenticated users can view public aliments" ON public_aliment;

-- 2. Créer une nouvelle politique corrigée pour les utilisateurs authentifiés
-- Utiliser auth.uid() IS NOT NULL pour vérifier l'authentification
CREATE POLICY "Authenticated users can view public aliments" ON public_aliment
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- 3. Alternative : Permettre l'accès en lecture à tous (même non authentifiés)
-- Si vous souhaitez que les aliments publics soient visibles même sans connexion,
-- vous pouvez utiliser cette politique à la place :
-- 
-- DROP POLICY IF EXISTS "Authenticated users can view public aliments" ON public_aliment;
-- CREATE POLICY "Everyone can view public aliments" ON public_aliment
--     FOR SELECT USING (true);

-- 4. Politique pour permettre aux administrateurs de gérer les aliments publics
-- (Optionnel - décommentez si vous voulez permettre aux admins de modifier)
-- CREATE POLICY "Admins can manage public aliments" ON public_aliment
--     FOR ALL USING (
--         auth.jwt() ->> 'role' = 'admin' OR 
--         auth.jwt() ->> 'app_metadata' ->> 'role' = 'admin'
--     );

-- Vérification que la politique est active
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'public_aliment';
