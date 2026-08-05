DELETE FROM public.phone_accounts WHERE node_id IS NULL OR node_id = '';

ALTER TABLE public.phone_accounts
  ALTER COLUMN node_id SET NOT NULL;

ALTER TABLE public.phone_accounts
  ADD COLUMN IF NOT EXISTS last_seen_at timestamp with time zone NOT NULL DEFAULT now();

DO $$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.phone_accounts'::regclass
      AND contype IN ('u','p')
      AND conname <> 'phone_accounts_pkey'
  LOOP
    EXECUTE format('ALTER TABLE public.phone_accounts DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE public.phone_accounts
  ADD CONSTRAINT phone_accounts_user_node_key UNIQUE (user_id, node_id);

CREATE INDEX IF NOT EXISTS phone_accounts_phone_hash_idx ON public.phone_accounts (phone_hash);