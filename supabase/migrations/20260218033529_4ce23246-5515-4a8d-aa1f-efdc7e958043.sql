
-- Academy RBAC: roles
CREATE TABLE public.academy_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.academy_roles (name, sort_order) VALUES
  ('CEO', 0),
  ('Admin', 1),
  ('Coach', 2),
  ('Member', 3);

-- Academy RBAC: permissions
CREATE TABLE public.academy_permissions (
  key text PRIMARY KEY,
  description text NOT NULL DEFAULT ''
);

INSERT INTO public.academy_permissions (key, description) VALUES
  ('manage_roles', 'Assign and revoke academy roles'),
  ('manage_users', 'View and manage user data'),
  ('manage_content', 'Create/edit/delete lessons and modules'),
  ('manage_notifications', 'Send announcements and notifications'),
  ('manage_live_sessions', 'Create/edit live sessions'),
  ('moderate_chat', 'Delete/edit any chat message'),
  ('view_admin_panel', 'Access admin dashboard'),
  ('coach_reply', 'Reply to coach tickets');

-- Academy RBAC: role ↔ permission mapping
CREATE TABLE public.academy_role_permissions (
  role_id uuid REFERENCES public.academy_roles(id) ON DELETE CASCADE,
  permission_key text REFERENCES public.academy_permissions(key) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_key)
);

-- Seed permissions per role
INSERT INTO public.academy_role_permissions (role_id, permission_key)
SELECT r.id, p.key
FROM public.academy_roles r
CROSS JOIN public.academy_permissions p
WHERE r.name = 'CEO';

INSERT INTO public.academy_role_permissions (role_id, permission_key)
SELECT r.id, p.key
FROM public.academy_roles r
CROSS JOIN public.academy_permissions p
WHERE r.name = 'Admin' AND p.key != 'manage_roles';

INSERT INTO public.academy_role_permissions (role_id, permission_key)
SELECT r.id, p.key
FROM public.academy_roles r
CROSS JOIN public.academy_permissions p
WHERE r.name = 'Coach' AND p.key IN ('moderate_chat', 'view_admin_panel', 'coach_reply');

-- Academy RBAC: user ↔ role assignment
CREATE TABLE public.academy_user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role_id uuid NOT NULL REFERENCES public.academy_roles(id) ON DELETE CASCADE,
  assigned_by uuid,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

-- RLS on all tables
ALTER TABLE public.academy_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_user_roles ENABLE ROW LEVEL SECURITY;

-- Read policies (public for UI rendering)
CREATE POLICY "Anyone can read academy_roles" ON public.academy_roles FOR SELECT USING (true);
CREATE POLICY "Anyone can read academy_permissions" ON public.academy_permissions FOR SELECT USING (true);
CREATE POLICY "Anyone can read academy_role_permissions" ON public.academy_role_permissions FOR SELECT USING (true);
CREATE POLICY "Authenticated can read academy_user_roles" ON public.academy_user_roles FOR SELECT USING (auth.uid() IS NOT NULL);

-- Security definer: check if user is CEO
CREATE OR REPLACE FUNCTION public.is_academy_ceo(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.academy_user_roles aur
    JOIN public.academy_roles ar ON ar.id = aur.role_id
    WHERE aur.user_id = _user_id AND ar.name = 'CEO'
  );
$$;

-- Security definer: check permission
CREATE OR REPLACE FUNCTION public.has_academy_permission(_user_id uuid, _permission_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.academy_user_roles aur
    JOIN public.academy_role_permissions arp ON arp.role_id = aur.role_id
    WHERE aur.user_id = _user_id AND arp.permission_key = _permission_key
  );
$$;

-- Security definer: get academy role name for a user
CREATE OR REPLACE FUNCTION public.get_academy_role_name(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ar.name FROM public.academy_user_roles aur
  JOIN public.academy_roles ar ON ar.id = aur.role_id
  WHERE aur.user_id = _user_id
  LIMIT 1;
$$;

-- Only CEO can mutate academy_user_roles
CREATE POLICY "Only CEO can assign roles" ON public.academy_user_roles FOR INSERT WITH CHECK (public.is_academy_ceo(auth.uid()));
CREATE POLICY "Only CEO can update roles" ON public.academy_user_roles FOR UPDATE USING (public.is_academy_ceo(auth.uid()));
CREATE POLICY "Only CEO can delete roles" ON public.academy_user_roles FOR DELETE USING (public.is_academy_ceo(auth.uid()));

-- No one can mutate roles/permissions/role_permissions tables (managed by migrations only)

-- Auto-assign Member on profile creation
CREATE OR REPLACE FUNCTION public.assign_default_academy_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _member_role_id uuid;
BEGIN
  SELECT id INTO _member_role_id FROM public.academy_roles WHERE name = 'Member' LIMIT 1;
  IF _member_role_id IS NOT NULL THEN
    INSERT INTO public.academy_user_roles (user_id, role_id)
    VALUES (NEW.user_id, _member_role_id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created_assign_academy_role
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.assign_default_academy_role();
