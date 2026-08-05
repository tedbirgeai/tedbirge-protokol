ALTER TABLE public.relay_directory ADD COLUMN IF NOT EXISTS person_id text;
CREATE INDEX IF NOT EXISTS relay_directory_person_idx ON public.relay_directory (person_id);
CREATE INDEX IF NOT EXISTS relay_envelopes_target_idx ON public.relay_envelopes (target_node, created_at);