-- Script pour vérifier le contenu des tables d'aliments
-- À exécuter dans l'interface SQL de Supabase

-- 1. Vérifier le contenu de la table public_aliment
SELECT 'Contenu table public_aliment' as info;
SELECT 
    id, 
    nom, 
    type_aliment, 
    calories_kcal,
    created_at
FROM public_aliment 
ORDER BY created_at DESC
LIMIT 10;

-- 2. Vérifier le contenu de la table private_aliment
SELECT 'Contenu table private_aliment' as info;
SELECT 
    id, 
    nom, 
    type_aliment, 
    calories_kcal,
    user_id,
    created_at
FROM private_aliment 
ORDER BY created_at DESC
LIMIT 10;

-- 3. Compter les aliments
SELECT 
    'Nombre d''aliments publics' as type,
    count(*) as total
FROM public_aliment
UNION ALL
SELECT 
    'Nombre d''aliments privés' as type,
    count(*) as total
FROM private_aliment;

-- 4. Vérifier les politiques RLS actives
SELECT 
    'Politiques RLS pour public_aliment' as info;
SELECT 
    policyname,
    cmd,
    permissive,
    qual
FROM pg_policies 
WHERE tablename = 'public_aliment';

-- 5. Vérifier les politiques RLS pour private_aliment
SELECT 
    'Politiques RLS pour private_aliment' as info;
SELECT 
    policyname,
    cmd,
    permissive,
    qual
FROM pg_policies 
WHERE tablename = 'private_aliment';

-- 6. Test d'accès en tant qu'utilisateur authentifié
SELECT 'Test accès utilisateur authentifié' as test;
SELECT 
    'Votre ID utilisateur' as info,
    auth.uid() as user_id;

-- Test de lecture des aliments publics
SELECT 
    'Aliments publics accessibles' as test,
    count(*) as accessible_count
FROM public_aliment;

-- Test de lecture des aliments privés
SELECT 
    'Aliments privés accessibles' as test,
    count(*) as accessible_count
FROM private_aliment;
