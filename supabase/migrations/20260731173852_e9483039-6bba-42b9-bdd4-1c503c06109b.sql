-- devices: prevent reassigning a device to a license the user has no rights to
DROP POLICY IF EXISTS devices_update_own ON public.devices;
CREATE POLICY devices_update_own ON public.devices
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.licenses l
    WHERE l.id = devices.license_id
      AND (
        l.user_id = auth.uid()
        OR (l.organization_id IS NOT NULL AND private.is_org_member(auth.uid(), l.organization_id))
      )
  )
);

-- field_reports: referenced device/license must belong to the submitter (or their org)
DROP POLICY IF EXISTS field_reports_insert_own ON public.field_reports;
CREATE POLICY field_reports_insert_own ON public.field_reports
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND status = 'open'
  AND admin_note IS NULL
  AND severity = ANY (ARRAY['info','warning','critical'])
  AND char_length(title) >= 3 AND char_length(title) <= 160
  AND char_length(detail) >= 10 AND char_length(detail) <= 4000
  AND (
    device_id IS NULL OR EXISTS (
      SELECT 1 FROM public.devices d
      WHERE d.id = field_reports.device_id
        AND (
          d.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.licenses l
            WHERE l.id = d.license_id
              AND l.organization_id IS NOT NULL
              AND private.is_org_member(auth.uid(), l.organization_id)
          )
        )
    )
  )
  AND (
    license_id IS NULL OR EXISTS (
      SELECT 1 FROM public.licenses l
      WHERE l.id = field_reports.license_id
        AND (
          l.user_id = auth.uid()
          OR (l.organization_id IS NOT NULL AND private.is_org_member(auth.uid(), l.organization_id))
        )
    )
  )
);