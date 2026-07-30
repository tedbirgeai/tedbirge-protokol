REVOKE INSERT, UPDATE, DELETE ON public.ai_leads FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.link_alerts FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.mesh_messages FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.node_enrollments FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.outage_events FROM anon, authenticated;

GRANT ALL ON public.ai_leads TO service_role;
GRANT ALL ON public.link_alerts TO service_role;
GRANT ALL ON public.mesh_messages TO service_role;
GRANT ALL ON public.node_enrollments TO service_role;
GRANT ALL ON public.outage_events TO service_role;