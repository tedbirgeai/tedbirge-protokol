CREATE TABLE public.contact_vaults (
  user_id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  ciphertext text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_vaults TO authenticated;
GRANT ALL ON public.contact_vaults TO service_role;
ALTER TABLE public.contact_vaults ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own vault" ON public.contact_vaults FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER contact_vaults_updated_at BEFORE UPDATE ON public.contact_vaults FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();