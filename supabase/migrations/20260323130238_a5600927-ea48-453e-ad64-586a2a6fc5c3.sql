
CREATE TABLE public.link_previews (
  url text PRIMARY KEY,
  title text,
  description text,
  image text,
  site_name text,
  favicon text,
  fetched_at timestamptz NOT NULL DEFAULT now()
);

-- No RLS — accessed only via edge function (service role)
ALTER TABLE public.link_previews ENABLE ROW LEVEL SECURITY;
