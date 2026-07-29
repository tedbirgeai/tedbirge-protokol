-- ORGANIZATIONS ------------------------------------------------------------
CREATE TYPE public.org_role AS ENUM ('owner', 'admin', 'operator', 'viewer');

CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  owner_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  email text,
  role public.org_role NOT NULL DEFAULT 'viewer',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_members TO authenticated;
GRANT ALL ON public.organization_members TO service_role;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION private.is_org_member(_user_id uuid, _org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members m
                 WHERE m.organization_id = _org_id AND m.user_id = _user_id)
$$;

CREATE OR REPLACE FUNCTION private.has_org_role(_user_id uuid, _org_id uuid, _roles text[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members m
                 WHERE m.organization_id = _org_id AND m.user_id = _user_id
                   AND m.role::text = ANY (_roles))
$$;

CREATE POLICY organizations_select_member ON public.organizations
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR private.is_org_member(auth.uid(), id) OR private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY organizations_insert_own ON public.organizations
  FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY organizations_update_admin ON public.organizations
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR private.has_org_role(auth.uid(), id, ARRAY['owner','admin']))
  WITH CHECK (owner_id = auth.uid() OR private.has_org_role(auth.uid(), id, ARRAY['owner','admin']));
CREATE POLICY organizations_delete_owner ON public.organizations
  FOR DELETE TO authenticated USING (owner_id = auth.uid());

CREATE POLICY org_members_select ON public.organization_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.is_org_member(auth.uid(), organization_id) OR private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY org_members_manage ON public.organization_members
  FOR ALL TO authenticated
  USING (private.has_org_role(auth.uid(), organization_id, ARRAY['owner','admin']))
  WITH CHECK (private.has_org_role(auth.uid(), organization_id, ARRAY['owner','admin']));

CREATE TRIGGER organizations_updated_at BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER organization_members_updated_at BEFORE UPDATE ON public.organization_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- LICENSES <-> ORG ----------------------------------------------------------
ALTER TABLE public.licenses ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS licenses_organization_id_idx ON public.licenses(organization_id);

CREATE POLICY licenses_select_org ON public.licenses
  FOR SELECT TO authenticated
  USING (organization_id IS NOT NULL AND private.is_org_member(auth.uid(), organization_id));

CREATE POLICY devices_select_org ON public.devices
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.licenses l
                 WHERE l.id = devices.license_id AND l.organization_id IS NOT NULL
                   AND private.is_org_member(auth.uid(), l.organization_id)));

CREATE POLICY license_events_select_org ON public.license_events
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.licenses l
                 WHERE l.id = license_events.license_id AND l.organization_id IS NOT NULL
                   AND private.is_org_member(auth.uid(), l.organization_id)));

CREATE POLICY field_reports_select_org ON public.field_reports
  FOR SELECT TO authenticated
  USING (license_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.licenses l
                 WHERE l.id = field_reports.license_id AND l.organization_id IS NOT NULL
                   AND private.is_org_member(auth.uid(), l.organization_id)));

-- WEBHOOKS ------------------------------------------------------------------
CREATE TABLE public.webhook_endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  url text NOT NULL,
  secret text NOT NULL DEFAULT encode(extensions.gen_random_bytes(24), 'hex'),
  events text[] NOT NULL DEFAULT ARRAY['license_event','field_report'],
  active boolean NOT NULL DEFAULT true,
  last_status integer,
  last_delivery_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.webhook_endpoints TO authenticated;
GRANT ALL ON public.webhook_endpoints TO service_role;
ALTER TABLE public.webhook_endpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY webhook_endpoints_own ON public.webhook_endpoints
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND (char_length(url) BETWEEN 8 AND 500) AND url ~ '^https://');

CREATE TRIGGER webhook_endpoints_updated_at BEFORE UPDATE ON public.webhook_endpoints
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id uuid NOT NULL REFERENCES public.webhook_endpoints(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  event_type text NOT NULL,
  payload jsonb,
  response_code integer,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.webhook_deliveries TO authenticated;
GRANT ALL ON public.webhook_deliveries TO service_role;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY webhook_deliveries_select_own ON public.webhook_deliveries
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- API USAGE -----------------------------------------------------------------
CREATE TABLE public.api_usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id uuid REFERENCES public.licenses(id) ON DELETE CASCADE,
  user_id uuid,
  endpoint text NOT NULL,
  status_code integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX api_usage_events_license_created_idx ON public.api_usage_events(license_id, created_at DESC);
GRANT SELECT ON public.api_usage_events TO authenticated;
GRANT ALL ON public.api_usage_events TO service_role;
ALTER TABLE public.api_usage_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY api_usage_events_select_own ON public.api_usage_events
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY api_usage_events_select_admin ON public.api_usage_events
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));

-- DEVICE HEALTH -------------------------------------------------------------
ALTER TABLE public.devices ADD COLUMN IF NOT EXISTS last_error_code text;
ALTER TABLE public.devices ADD COLUMN IF NOT EXISTS last_error_at timestamptz;