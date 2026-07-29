-- 1) QR ile düğüm kaydı için tek kullanımlık davet kayıtları
CREATE TABLE public.node_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id uuid NOT NULL REFERENCES public.licenses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  token text NOT NULL UNIQUE,
  node_id text NOT NULL,
  label text,
  region text NOT NULL DEFAULT 'TR',
  carrier text NOT NULL DEFAULT 'lora',
  role text NOT NULL DEFAULT 'edge',
  kind text NOT NULL DEFAULT 'node',
  status text NOT NULL DEFAULT 'pending',
  device_id uuid,
  claimed_at timestamptz,
  claimed_fingerprint text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 minutes'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.node_enrollments TO authenticated;
GRANT ALL ON public.node_enrollments TO service_role;
ALTER TABLE public.node_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "enrollments_select_own" ON public.node_enrollments FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER node_enrollments_updated_at BEFORE UPDATE ON public.node_enrollments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX node_enrollments_token_idx ON public.node_enrollments (token);

-- 2) Uçtan uca şifreleme anahtar alanları
ALTER TABLE public.devices
  ADD COLUMN IF NOT EXISTS public_key text,
  ADD COLUMN IF NOT EXISTS key_fingerprint text,
  ADD COLUMN IF NOT EXISTS e2ee boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS key_updated_at timestamptz;
ALTER TABLE public.mesh_messages
  ADD COLUMN IF NOT EXISTS encrypted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cipher_alg text;

-- 3) Kesinti olay kaydı
CREATE TABLE public.outage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id uuid NOT NULL,
  user_id uuid,
  device_id uuid,
  node_id text NOT NULL,
  layer text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  duration_seconds integer,
  failover_to text,
  cause text,
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.outage_events TO authenticated;
GRANT ALL ON public.outage_events TO service_role;
ALTER TABLE public.outage_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "outages_select_own" ON public.outage_events FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER outage_events_updated_at BEFORE UPDATE ON public.outage_events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX outage_events_device_open_idx ON public.outage_events (device_id) WHERE resolved = false;

-- 4) Model kalibrasyon testi sonuçları
CREATE TABLE public.calibration_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  carrier text NOT NULL,
  terrain text NOT NULL,
  antenna_height text NOT NULL,
  sample_count integer NOT NULL,
  model_hop_km numeric NOT NULL,
  calibrated_hop_km numeric NOT NULL,
  mae_km numeric,
  bias_km numeric,
  accuracy_pct numeric,
  verdict text NOT NULL,
  detail jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.calibration_runs TO authenticated;
GRANT ALL ON public.calibration_runs TO service_role;
ALTER TABLE public.calibration_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "calibration_select_own" ON public.calibration_runs FOR SELECT TO authenticated USING (auth.uid() = user_id);