-- Pulse events have text identities, separate from chat message UUIDs.
CREATE TABLE public.pulse_spy_reactions (
  event_id text NOT NULL REFERENCES public.pulse_spy_events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji text NOT NULL CHECK (emoji IN ('🔥', '👀')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, user_id, emoji)
);
ALTER TABLE public.pulse_spy_reactions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pulse_spy_reactions FROM PUBLIC, anon, authenticated;

-- Members receive totals and their own selection, never other member identities.
CREATE FUNCTION public.pulse_spy_reactions_read(p_event_ids text[])
RETURNS TABLE(event_id text, emoji text, count bigint, active boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.can_read_pulse(auth.uid()) THEN
    RAISE EXCEPTION 'Pulse requires active membership' USING ERRCODE='42501';
  END IF;
  IF coalesce(cardinality(p_event_ids),0)>100 THEN RAISE EXCEPTION 'Too many events'; END IF;
  RETURN QUERY SELECT r.event_id,r.emoji,count(*),bool_or(r.user_id=auth.uid())
    FROM public.pulse_spy_reactions r WHERE r.event_id=ANY(p_event_ids)
    GROUP BY r.event_id,r.emoji;
END;
$$;
CREATE FUNCTION public.pulse_spy_reaction_set(p_event_id text,p_emoji text,p_active boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.can_read_pulse(auth.uid()) THEN
    RAISE EXCEPTION 'Pulse requires active membership' USING ERRCODE='42501';
  END IF;
  IF p_emoji IS NULL OR p_emoji NOT IN ('🔥','👀') OR p_active IS NULL THEN RAISE EXCEPTION 'Invalid reaction'; END IF;
  IF p_active THEN
    INSERT INTO public.pulse_spy_reactions(event_id,user_id,emoji)
      VALUES(p_event_id,auth.uid(),p_emoji) ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM public.pulse_spy_reactions WHERE event_id=p_event_id AND user_id=auth.uid() AND emoji=p_emoji;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.pulse_spy_reactions_read(text[]) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.pulse_spy_reaction_set(text,text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.pulse_spy_reactions_read(text[]),public.pulse_spy_reaction_set(text,text,boolean) TO authenticated;
