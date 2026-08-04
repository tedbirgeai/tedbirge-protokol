CREATE TABLE IF NOT EXISTS public.phone_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_hash text NOT NULL UNIQUE,
  person_id text NOT NULL,
  node_id text,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS phone_accounts_hash_idx ON public.phone_accounts (phone_hash);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.phone_accounts TO authenticated;
GRANT ALL ON public.phone_accounts TO service_role;

ALTER TABLE public.phone_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own phone account" ON public.phone_accounts;
CREATE POLICY "own phone account" ON public.phone_accounts
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);