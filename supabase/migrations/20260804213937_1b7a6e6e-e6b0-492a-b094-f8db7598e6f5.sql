CREATE TABLE IF NOT EXISTS public.phone_otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_hash text NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS phone_otp_codes_phone_idx ON public.phone_otp_codes (phone_hash, created_at DESC);
GRANT ALL ON public.phone_otp_codes TO service_role;
ALTER TABLE public.phone_otp_codes ENABLE ROW LEVEL SECURITY;