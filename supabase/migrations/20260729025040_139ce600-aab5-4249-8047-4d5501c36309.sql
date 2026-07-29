CREATE TABLE public.devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id uuid NOT NULL REFERENCES public.licenses(id) ON DELETE CASCADE,
  user_id uuid,
  node_id text NOT NULL,
  label text,
  region text NOT NULL DEFAULT 'TR',
  carrier text,
  firmware text,
  status text NOT NULL DEFAULT 'active',
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (license_id, node_id)
);

CREATE TABLE public.telemetry_samples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  license_id uuid NOT NULL REFERENCES public.licenses(id) ON DELETE CASCADE,
  carrier text,
  rtt_ms numeric,
  throughput_kbps numeric,
  packet_loss_pct numeric,
  hops integer,
  bytes bigint,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX telemetry_samples_device_created_idx ON public.telemetry_samples (device_id, created_at DESC);
CREATE INDEX devices_user_idx ON public.devices (user_id);

GRANT SELECT, UPDATE, DELETE ON public.devices TO authenticated;
GRANT ALL ON public.devices TO service_role;
GRANT SELECT ON public.telemetry_samples TO authenticated;
GRANT ALL ON public.telemetry_samples TO service_role;

ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telemetry_samples ENABLE ROW LEVEL SECURITY;

CREATE POLICY devices_select_own ON public.devices FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY devices_update_own ON public.devices FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY devices_delete_own ON public.devices FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY devices_admin_select ON public.devices FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY telemetry_select_own ON public.telemetry_samples FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.devices d WHERE d.id = telemetry_samples.device_id AND d.user_id = auth.uid())
);
CREATE POLICY telemetry_admin_select ON public.telemetry_samples FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER devices_set_updated_at BEFORE UPDATE ON public.devices
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();