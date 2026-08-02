-- 1) devices: explicit ownership-checked insert
DROP POLICY IF EXISTS devices_insert_own ON public.devices;
CREATE POLICY devices_insert_own ON public.devices
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.licenses l
      WHERE l.id = devices.license_id
        AND (l.user_id = auth.uid()
             OR (l.organization_id IS NOT NULL AND private.is_org_member(auth.uid(), l.organization_id)))
    )
  );

-- 2) organization_members: member emails only to self, org owners/admins, platform admin
DROP POLICY IF EXISTS org_members_select ON public.organization_members;
CREATE POLICY org_members_select ON public.organization_members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR private.has_org_role(auth.uid(), organization_id, ARRAY['owner','admin'])
    OR private.has_role(auth.uid(), 'admin'::app_role)
  );

-- 3) webhook_deliveries: explicit deny-by-default for client writes
DROP POLICY IF EXISTS webhook_deliveries_no_client_insert ON public.webhook_deliveries;
CREATE POLICY webhook_deliveries_no_client_insert ON public.webhook_deliveries
  AS RESTRICTIVE FOR INSERT TO authenticated, anon WITH CHECK (false);
DROP POLICY IF EXISTS webhook_deliveries_no_client_update ON public.webhook_deliveries;
CREATE POLICY webhook_deliveries_no_client_update ON public.webhook_deliveries
  AS RESTRICTIVE FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS webhook_deliveries_no_client_delete ON public.webhook_deliveries;
CREATE POLICY webhook_deliveries_no_client_delete ON public.webhook_deliveries
  AS RESTRICTIVE FOR DELETE TO authenticated, anon USING (false);
REVOKE INSERT, UPDATE, DELETE ON public.webhook_deliveries FROM authenticated;
GRANT ALL ON public.webhook_deliveries TO service_role;