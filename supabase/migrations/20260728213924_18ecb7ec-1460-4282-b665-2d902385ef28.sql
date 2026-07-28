-- 1) Replace always-true INSERT policy on pilot_requests with a validating one
DROP POLICY IF EXISTS pilot_requests_public_insert ON public.pilot_requests;

CREATE POLICY pilot_requests_public_insert
ON public.pilot_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (
  (user_id IS NULL OR user_id = auth.uid())
  AND status = 'new'
  AND admin_note IS NULL
  AND char_length(full_name) BETWEEN 2 AND 120
  AND char_length(organization) BETWEEN 2 AND 200
  AND char_length(email) BETWEEN 5 AND 254
  AND email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND (phone IS NULL OR char_length(phone) <= 40)
  AND (carrier IS NULL OR char_length(carrier) <= 80)
  AND (node_count IS NULL OR (node_count > 0 AND node_count <= 1000000))
  AND char_length(use_case) BETWEEN 10 AND 5000
);

-- 2) Revoke EXECUTE on SECURITY DEFINER functions that signed-in users must not call directly.
-- Trigger functions still fire via triggers; RLS helper functions keep EXECUTE since policies need them.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.grant_admin_for_owner_email() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
