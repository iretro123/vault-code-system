-- Create RPC function to get vault timeline events
CREATE OR REPLACE FUNCTION public.get_vault_timeline(_user_id uuid, _limit integer DEFAULT 50)
RETURNS TABLE(
  event_id uuid,
  event_type text,
  event_context jsonb,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    ve.id as event_id,
    ve.event_type,
    ve.event_context,
    ve.created_at
  FROM vault_events ve
  WHERE ve.user_id = _user_id
  ORDER BY ve.created_at DESC
  LIMIT _limit;
END;
$function$;