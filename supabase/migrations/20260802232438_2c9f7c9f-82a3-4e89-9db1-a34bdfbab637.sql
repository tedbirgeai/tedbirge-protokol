DROP POLICY IF EXISTS mesh_messages_no_client_write ON public.mesh_messages;
CREATE POLICY mesh_messages_no_client_write ON public.mesh_messages
  AS RESTRICTIVE FOR INSERT TO authenticated, anon WITH CHECK (false);
DROP POLICY IF EXISTS mesh_messages_no_client_update ON public.mesh_messages;
CREATE POLICY mesh_messages_no_client_update ON public.mesh_messages
  AS RESTRICTIVE FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS mesh_messages_no_client_delete ON public.mesh_messages;
CREATE POLICY mesh_messages_no_client_delete ON public.mesh_messages
  AS RESTRICTIVE FOR DELETE TO authenticated, anon USING (false);
REVOKE INSERT, UPDATE, DELETE ON public.mesh_messages FROM authenticated;
GRANT ALL ON public.mesh_messages TO service_role;

REVOKE SELECT ON public.webhook_endpoints FROM authenticated;
GRANT SELECT (id, user_id, organization_id, url, events, active, last_status, last_delivery_at, created_at, updated_at)
  ON public.webhook_endpoints TO authenticated;
GRANT ALL ON public.webhook_endpoints TO service_role;

DROP POLICY IF EXISTS field_measurements_no_client_update ON public.field_measurements;
CREATE POLICY field_measurements_no_client_update ON public.field_measurements
  AS RESTRICTIVE FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS field_measurements_no_client_delete ON public.field_measurements;
CREATE POLICY field_measurements_no_client_delete ON public.field_measurements
  AS RESTRICTIVE FOR DELETE TO authenticated, anon USING (false);
REVOKE UPDATE, DELETE ON public.field_measurements FROM authenticated;
GRANT ALL ON public.field_measurements TO service_role;