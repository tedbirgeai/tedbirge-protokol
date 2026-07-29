ALTER TABLE public.ai_leads
  ADD COLUMN IF NOT EXISTS plan jsonb,
  ADD COLUMN IF NOT EXISTS proposal_ref text,
  ADD COLUMN IF NOT EXISTS last_notified_status text;

CREATE TABLE IF NOT EXISTS public.ai_chat_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_hash text NOT NULL,
  window_start timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_hash, window_start)
);

GRANT ALL ON public.ai_chat_usage TO service_role;
ALTER TABLE public.ai_chat_usage ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.ai_lead_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.ai_leads(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  note text,
  channel text NOT NULL DEFAULT 'webhook',
  delivery_status text NOT NULL DEFAULT 'pending',
  response_code integer,
  response_body text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_lead_events_lead_id_idx ON public.ai_lead_events (lead_id, created_at DESC);

GRANT SELECT ON public.ai_lead_events TO authenticated;
GRANT ALL ON public.ai_lead_events TO service_role;
ALTER TABLE public.ai_lead_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_lead_events_admin_select" ON public.ai_lead_events
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS update_ai_chat_usage_updated_at ON public.ai_chat_usage;
CREATE TRIGGER update_ai_chat_usage_updated_at
  BEFORE UPDATE ON public.ai_chat_usage
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_ai_lead_events_updated_at ON public.ai_lead_events;
CREATE TRIGGER update_ai_lead_events_updated_at
  BEFORE UPDATE ON public.ai_lead_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();