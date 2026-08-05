ALTER TABLE public.phone_accounts
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS phone_accounts_phone_hash_seen_idx
  ON public.phone_accounts (phone_hash, last_seen_at DESC);