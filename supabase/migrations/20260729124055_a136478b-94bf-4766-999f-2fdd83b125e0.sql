-- 1) License event log
CREATE TABLE public.license_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id uuid NOT NULL REFERENCES public.licenses(id) ON DELETE CASCADE,
  user_id uuid,
  device_id uuid,
  event text NOT NULL,
  detail text,
  actor text NOT NULL DEFAULT 'system',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_license_events_license ON public.license_events(license_id, created_at DESC);
GRANT SELECT ON public.license_events TO authenticated;
GRANT ALL ON public.license_events TO service_role;
ALTER TABLE public.license_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY license_events_select_own ON public.license_events
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY license_events_admin_select ON public.license_events
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));

-- 2) Field reports (saha uyarı / şikayet)
CREATE TABLE public.field_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  device_id uuid REFERENCES public.devices(id) ON DELETE SET NULL,
  license_id uuid REFERENCES public.licenses(id) ON DELETE SET NULL,
  severity text NOT NULL DEFAULT 'info',
  category text NOT NULL DEFAULT 'other',
  title text NOT NULL,
  detail text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_field_reports_user ON public.field_reports(user_id, created_at DESC);
GRANT SELECT, INSERT ON public.field_reports TO authenticated;
GRANT ALL ON public.field_reports TO service_role;
ALTER TABLE public.field_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY field_reports_select_own ON public.field_reports
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY field_reports_insert_own ON public.field_reports
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = user_id
    AND status = 'open'
    AND admin_note IS NULL
    AND severity IN ('info','warning','critical')
    AND char_length(title) BETWEEN 3 AND 160
    AND char_length(detail) BETWEEN 10 AND 4000
  );
CREATE POLICY field_reports_admin_select ON public.field_reports
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY field_reports_admin_update ON public.field_reports
  FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER field_reports_updated_at BEFORE UPDATE ON public.field_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Realtime
ALTER TABLE public.devices REPLICA IDENTITY FULL;
ALTER TABLE public.telemetry_samples REPLICA IDENTITY FULL;
ALTER TABLE public.field_reports REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.devices;
ALTER PUBLICATION supabase_realtime ADD TABLE public.telemetry_samples;
ALTER PUBLICATION supabase_realtime ADD TABLE public.field_reports;