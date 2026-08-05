CREATE TABLE public.history_chunks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id text NOT NULL,
  ciphertext text NOT NULL,
  byte_size integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.history_chunks TO authenticated;
GRANT ALL ON public.history_chunks TO service_role;

ALTER TABLE public.history_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own history select" ON public.history_chunks
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own history insert" ON public.history_chunks
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own history delete" ON public.history_chunks
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE INDEX history_chunks_user_created_idx ON public.history_chunks (user_id, created_at DESC);