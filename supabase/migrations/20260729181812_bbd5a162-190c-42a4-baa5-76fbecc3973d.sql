DROP POLICY IF EXISTS "ai_chat_usage_no_direct_client_access" ON public.ai_chat_usage;
CREATE POLICY "ai_chat_usage_no_direct_client_access"
ON public.ai_chat_usage
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);