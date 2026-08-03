CREATE TABLE IF NOT EXISTS public.relay_directory (
  node_id text PRIMARY KEY,
  sign_public text NOT NULL,
  box_public text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.relay_directory TO service_role;
ALTER TABLE public.relay_directory ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.relay_envelopes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pkt_id text NOT NULL UNIQUE,
  target_node text NOT NULL,
  origin_node text NOT NULL,
  envelope text NOT NULL,
  priority int NOT NULL DEFAULT 2,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days')
);
GRANT ALL ON public.relay_envelopes TO service_role;
ALTER TABLE public.relay_envelopes ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS relay_envelopes_target_idx ON public.relay_envelopes (target_node, created_at);
CREATE INDEX IF NOT EXISTS relay_envelopes_expires_idx ON public.relay_envelopes (expires_at);