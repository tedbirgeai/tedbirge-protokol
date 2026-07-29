CREATE TABLE public.ai_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization TEXT,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  country TEXT,
  use_case TEXT,
  carrier_need TEXT,
  node_count TEXT,
  urgency TEXT,
  qualification_score INT,
  summary TEXT,
  transcript JSONB,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.ai_leads TO authenticated;
GRANT ALL ON public.ai_leads TO service_role;

ALTER TABLE public.ai_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view ai leads" ON public.ai_leads
FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update ai leads" ON public.ai_leads
FOR UPDATE TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));