-- =============================================
-- VAULT OS DATABASE SCHEMA
-- =============================================

-- 1. CREATE ENUM FOR USER ROLES
CREATE TYPE public.app_role AS ENUM ('free', 'vault_os_owner', 'vault_access', 'vault_intelligence', 'operator');

-- 2. PROFILES TABLE (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  discipline_status TEXT NOT NULL DEFAULT 'inactive' CHECK (discipline_status IN ('active', 'inactive')),
  discipline_score INTEGER NOT NULL DEFAULT 0 CHECK (discipline_score >= 0 AND discipline_score <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. USER ROLES TABLE (separate for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'free',
  subscription_status TEXT NOT NULL DEFAULT 'none' CHECK (subscription_status IN ('none', 'active', 'cancelled', 'expired')),
  subscription_started_at TIMESTAMPTZ,
  subscription_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- 4. TRADING RULES TABLE
CREATE TABLE public.trading_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  max_risk_per_trade DECIMAL(5,2) NOT NULL DEFAULT 1.0 CHECK (max_risk_per_trade > 0 AND max_risk_per_trade <= 100),
  max_trades_per_day INTEGER NOT NULL DEFAULT 3 CHECK (max_trades_per_day > 0 AND max_trades_per_day <= 50),
  max_daily_loss DECIMAL(5,2) NOT NULL DEFAULT 3.0 CHECK (max_daily_loss > 0 AND max_daily_loss <= 100),
  allowed_sessions TEXT[] NOT NULL DEFAULT ARRAY['london', 'newyork'],
  forbidden_behaviors TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. TRADE LOG ENTRIES TABLE
CREATE TABLE public.trade_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trade_date DATE NOT NULL DEFAULT CURRENT_DATE,
  risk_used DECIMAL(5,2) NOT NULL CHECK (risk_used >= 0 AND risk_used <= 100),
  risk_reward DECIMAL(5,2) NOT NULL CHECK (risk_reward >= 0),
  followed_rules BOOLEAN NOT NULL,
  emotional_state INTEGER NOT NULL CHECK (emotional_state >= 1 AND emotional_state <= 5),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for faster queries on trade entries
CREATE INDEX idx_trade_entries_user_date ON public.trade_entries(user_id, trade_date DESC);
CREATE INDEX idx_trade_entries_user_created ON public.trade_entries(user_id, created_at DESC);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_entries ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- USER ROLES POLICIES
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Note: Only system/admin can modify roles, no user insert/update policies

-- TRADING RULES POLICIES
CREATE POLICY "Users can view their own rules"
  ON public.trading_rules FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own rules"
  ON public.trading_rules FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own rules"
  ON public.trading_rules FOR UPDATE
  USING (auth.uid() = user_id);

-- TRADE ENTRIES POLICIES
CREATE POLICY "Users can view their own trade entries"
  ON public.trade_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own trade entries"
  ON public.trade_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trade entries"
  ON public.trade_entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trade entries"
  ON public.trade_entries FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================
-- SECURITY DEFINER FUNCTION FOR ROLE CHECKS
-- =============================================

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND (subscription_status = 'active' OR role = 'free')
  )
$$;

-- Function to get user's highest role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
    AND (subscription_status = 'active' OR role = 'free')
  ORDER BY 
    CASE role
      WHEN 'operator' THEN 5
      WHEN 'vault_intelligence' THEN 4
      WHEN 'vault_access' THEN 3
      WHEN 'vault_os_owner' THEN 2
      WHEN 'free' THEN 1
    END DESC
  LIMIT 1
$$;

-- =============================================
-- AUTO-CREATE PROFILE & ROLE ON SIGNUP
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  
  -- Assign free role by default
  INSERT INTO public.user_roles (user_id, role, subscription_status)
  VALUES (NEW.id, 'free', 'none');
  
  -- Create empty trading rules
  INSERT INTO public.trading_rules (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- UPDATE TIMESTAMPS TRIGGER
-- =============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_roles_updated_at
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trading_rules_updated_at
  BEFORE UPDATE ON public.trading_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();