-- outage_events: explicit deny-by-default for client writes (service_role only)
DROP POLICY IF EXISTS outage_events_no_client_write ON public.outage_events;
CREATE POLICY outage_events_no_client_write ON public.outage_events
  AS RESTRICTIVE FOR INSERT TO authenticated, anon WITH CHECK (false);
DROP POLICY IF EXISTS outage_events_no_client_update ON public.outage_events;
CREATE POLICY outage_events_no_client_update ON public.outage_events
  AS RESTRICTIVE FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS outage_events_no_client_delete ON public.outage_events;
CREATE POLICY outage_events_no_client_delete ON public.outage_events
  AS RESTRICTIVE FOR DELETE TO authenticated, anon USING (false);
REVOKE INSERT, UPDATE, DELETE ON public.outage_events FROM authenticated;
GRANT ALL ON public.outage_events TO service_role;

-- field_reports: deletes explicitly denied for clients (audit trail immutability)
DROP POLICY IF EXISTS field_reports_no_client_delete ON public.field_reports;
CREATE POLICY field_reports_no_client_delete ON public.field_reports
  AS RESTRICTIVE FOR DELETE TO authenticated, anon USING (false);
REVOKE DELETE ON public.field_reports FROM authenticated;
GRANT ALL ON public.field_reports TO service_role;

-- node_enrollments: organization members can view enrollments for shared licenses
DROP POLICY IF EXISTS enrollments_select_org ON public.node_enrollments;
CREATE POLICY enrollments_select_org ON public.node_enrollments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.licenses l
      WHERE l.id = node_enrollments.license_id
        AND l.organization_id IS NOT NULL
        AND private.is_org_member(auth.uid(), l.organization_id)
    )
  );