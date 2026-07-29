DROP POLICY IF EXISTS field_measurements_public_read ON public.field_measurements;

CREATE POLICY field_measurements_owner_select ON public.field_measurements
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY field_measurements_admin_select ON public.field_measurements
FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role));

REVOKE SELECT ON public.field_measurements FROM anon;
GRANT SELECT, INSERT ON public.field_measurements TO authenticated;
GRANT ALL ON public.field_measurements TO service_role;