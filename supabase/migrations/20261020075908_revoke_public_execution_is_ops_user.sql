-- Keep the operations helper callable only by trusted server-side roles.
-- This migration has already been applied to the production Supabase project.
REVOKE EXECUTE ON FUNCTION private.is_ops_user() FROM PUBLIC, anon, authenticated;
