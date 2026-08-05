-- native_push_tokens: server-only
REVOKE ALL ON public.native_push_tokens FROM anon, authenticated;
GRANT ALL ON public.native_push_tokens TO service_role;
ALTER TABLE public.native_push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.native_push_tokens FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "native_push_tokens_deny_all" ON public.native_push_tokens;
CREATE POLICY "native_push_tokens_deny_all"
  ON public.native_push_tokens
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- phone_otp_codes: server-only
REVOKE ALL ON public.phone_otp_codes FROM anon, authenticated;
GRANT ALL ON public.phone_otp_codes TO service_role;
ALTER TABLE public.phone_otp_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phone_otp_codes FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "phone_otp_codes_deny_all" ON public.phone_otp_codes;
CREATE POLICY "phone_otp_codes_deny_all"
  ON public.phone_otp_codes
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- relay_directory: server-only
REVOKE ALL ON public.relay_directory FROM anon, authenticated;
GRANT ALL ON public.relay_directory TO service_role;
ALTER TABLE public.relay_directory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relay_directory FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "relay_directory_deny_all" ON public.relay_directory;
CREATE POLICY "relay_directory_deny_all"
  ON public.relay_directory
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- relay_envelopes: server-only
REVOKE ALL ON public.relay_envelopes FROM anon, authenticated;
GRANT ALL ON public.relay_envelopes TO service_role;
ALTER TABLE public.relay_envelopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relay_envelopes FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "relay_envelopes_deny_all" ON public.relay_envelopes;
CREATE POLICY "relay_envelopes_deny_all"
  ON public.relay_envelopes
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);