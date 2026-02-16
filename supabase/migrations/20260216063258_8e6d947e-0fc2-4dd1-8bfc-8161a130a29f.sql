-- Enable realtime for academy_notifications so tray auto-opens on new inserts
ALTER PUBLICATION supabase_realtime ADD TABLE public.academy_notifications;