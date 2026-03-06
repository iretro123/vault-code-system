
-- Enable leaked password protection (HaveIBeenPwned check)
-- This is done via auth.config but we can set it via SQL
ALTER TABLE IF EXISTS auth.config SET (security.leaked_password_protection = 'on');
