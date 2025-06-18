-- Alternative : Créer une vue publique pour les utilisateurs
-- Cette approche est plus simple mais expose moins d'informations

-- Créer une vue publique des utilisateurs (seulement email et id)
CREATE OR REPLACE VIEW public.users_public AS
SELECT 
    id,
    email,
    created_at
FROM auth.users 
WHERE email_confirmed_at IS NOT NULL;

-- Donner les permissions de lecture à tous les utilisateurs authentifiés
GRANT SELECT ON public.users_public TO authenticated;

-- Politique RLS pour la vue
ALTER VIEW public.users_public OWNER TO supabase_admin;

-- Fonction RPC simplifiée pour chercher un utilisateur
CREATE OR REPLACE FUNCTION find_user_by_email_simple(user_email TEXT)
RETURNS TABLE (
    user_id UUID,
    email TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        up.id as user_id,
        up.email
    FROM public.users_public up
    WHERE up.email = user_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
