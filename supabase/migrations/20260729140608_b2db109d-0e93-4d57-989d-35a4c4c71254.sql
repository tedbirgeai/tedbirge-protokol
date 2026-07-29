-- 1. devices: rol / yedeklilik
ALTER TABLE public.devices
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'edge',
  ADD COLUMN IF NOT EXISTS failover_group text,
  ADD COLUMN IF NOT EXISTS failover_priority integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS is_backup boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS active_uplink boolean NOT NULL DEFAULT false;

-- 2. store-and-forward kuyruğu
CREATE TABLE public.mesh_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id uuid NOT NULL REFERENCES public.licenses(id) ON DELETE CASCADE,
  user_id uuid,
  origin_node text NOT NULL,
  target_node text,
  device_id uuid REFERENCES public.devices(id) ON DELETE SET NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  priority integer NOT NULL DEFAULT 5,
  status text NOT NULL DEFAULT 'queued',
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  queued_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '7 days',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX mesh_messages_pending_idx ON public.mesh_messages (license_id, status, priority, queued_at);
GRANT SELECT ON public.mesh_messages TO authenticated;
GRANT ALL ON public.mesh_messages TO service_role;
ALTER TABLE public.mesh_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mesh_messages_owner_select" ON public.mesh_messages
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE TRIGGER mesh_messages_updated_at BEFORE UPDATE ON public.mesh_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. katman bazlı bağlantı alarmları
CREATE TABLE public.link_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id uuid NOT NULL REFERENCES public.licenses(id) ON DELETE CASCADE,
  user_id uuid,
  device_id uuid REFERENCES public.devices(id) ON DELETE CASCADE,
  node_id text NOT NULL,
  layer text NOT NULL,
  state text NOT NULL,
  detail text,
  failover_to text,
  acknowledged boolean NOT NULL DEFAULT false,
  detected_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX link_alerts_user_idx ON public.link_alerts (user_id, detected_at DESC);
GRANT SELECT, UPDATE ON public.link_alerts TO authenticated;
GRANT ALL ON public.link_alerts TO service_role;
ALTER TABLE public.link_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "link_alerts_owner_select" ON public.link_alerts
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "link_alerts_owner_update" ON public.link_alerts
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER link_alerts_updated_at BEFORE UPDATE ON public.link_alerts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. gerçek saha ölçümleri
CREATE TABLE public.field_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  carrier text NOT NULL,
  terrain text NOT NULL,
  antenna_height text NOT NULL,
  distance_km numeric NOT NULL,
  link_ok boolean NOT NULL DEFAULT true,
  rssi_dbm numeric,
  snr_db numeric,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX field_measurements_carrier_idx ON public.field_measurements (carrier, terrain, antenna_height);
GRANT SELECT, INSERT ON public.field_measurements TO authenticated;
GRANT SELECT ON public.field_measurements TO anon;
GRANT ALL ON public.field_measurements TO service_role;
ALTER TABLE public.field_measurements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "field_measurements_public_read" ON public.field_measurements
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "field_measurements_owner_insert" ON public.field_measurements
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE TRIGGER field_measurements_updated_at BEFORE UPDATE ON public.field_measurements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. röle zinciri planları
CREATE TABLE public.relay_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  license_id uuid NOT NULL REFERENCES public.licenses(id) ON DELETE CASCADE,
  name text NOT NULL,
  carrier text NOT NULL,
  terrain text NOT NULL,
  antenna_height text NOT NULL,
  distance_km numeric NOT NULL,
  hop_km numeric NOT NULL,
  relay_count integer NOT NULL,
  nodes jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.relay_plans TO authenticated;
GRANT ALL ON public.relay_plans TO service_role;
ALTER TABLE public.relay_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "relay_plans_owner_all" ON public.relay_plans
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER relay_plans_updated_at BEFORE UPDATE ON public.relay_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. anlık panel bildirimi için realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.link_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mesh_messages;