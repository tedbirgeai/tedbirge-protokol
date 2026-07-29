ALTER TABLE public.devices ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'node';

CREATE TABLE IF NOT EXISTS public.ir_frames (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  license_id uuid NOT NULL REFERENCES public.licenses(id) ON DELETE CASCADE,
  temp_max_c numeric,
  temp_min_c numeric,
  temp_avg_c numeric,
  detections integer,
  alarm boolean NOT NULL DEFAULT false,
  alarm_reason text,
  frame_hash text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ir_frames_device_created_idx ON public.ir_frames (device_id, created_at DESC);

GRANT SELECT ON public.ir_frames TO authenticated;
GRANT ALL ON public.ir_frames TO service_role;

ALTER TABLE public.ir_frames ENABLE ROW LEVEL SECURITY;

CREATE POLICY ir_frames_select_own ON public.ir_frames FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.devices d WHERE d.id = ir_frames.device_id AND d.user_id = auth.uid()));

CREATE POLICY ir_frames_select_org ON public.ir_frames FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.licenses l WHERE l.id = ir_frames.license_id AND l.organization_id IS NOT NULL AND private.is_org_member(auth.uid(), l.organization_id)));

CREATE POLICY ir_frames_admin_select ON public.ir_frames FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role));

ALTER PUBLICATION supabase_realtime ADD TABLE public.ir_frames;

DELETE FROM public.devices WHERE node_id IN ('saha-A','saha-B');