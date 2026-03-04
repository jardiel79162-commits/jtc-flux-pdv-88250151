
-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT,
  full_name TEXT,
  cpf TEXT,
  phone TEXT,
  cep TEXT,
  street TEXT,
  number TEXT,
  neighborhood TEXT,
  city TEXT,
  state TEXT,
  invite_code TEXT UNIQUE,
  referred_by_code TEXT,
  email_verified BOOLEAN DEFAULT false,
  subscription_ends_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage roles" ON public.user_roles FOR ALL USING (true);

-- Store settings table
CREATE TABLE public.store_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  store_name TEXT DEFAULT '',
  commercial_phone TEXT DEFAULT '',
  store_address TEXT DEFAULT '',
  operation_type TEXT DEFAULT '',
  primary_color TEXT DEFAULT '#4C6FFF',
  logo_url TEXT DEFAULT '',
  category TEXT DEFAULT '',
  quick_actions_enabled BOOLEAN DEFAULT false,
  hide_trial_message BOOLEAN DEFAULT false,
  pix_key_type TEXT,
  pix_key TEXT,
  pix_receiver_name TEXT,
  pix_mode TEXT DEFAULT 'manual',
  mercado_pago_cpf TEXT,
  mercado_pago_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own store settings" ON public.store_settings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Categories table
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own categories" ON public.categories FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Suppliers table
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  cnpj TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  contact_person TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own suppliers" ON public.suppliers FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  cost_price NUMERIC,
  promotional_price NUMERIC,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  min_stock_quantity INTEGER DEFAULT 0,
  barcode TEXT,
  internal_code TEXT,
  is_active BOOLEAN DEFAULT true,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  photos TEXT[],
  product_type TEXT DEFAULT 'unidade',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own products" ON public.products FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Customers table
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  cpf TEXT,
  birth_date DATE,
  address TEXT,
  phone TEXT,
  current_balance NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own customers" ON public.customers FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Customer transactions table
CREATE TABLE public.customer_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own customer transactions" ON public.customer_transactions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.user_id = auth.uid()));

-- Sales table
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'dinheiro',
  payment_status TEXT DEFAULT 'completed',
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name TEXT,
  credit_used NUMERIC DEFAULT 0,
  remaining_payment_method TEXT,
  remaining_amount NUMERIC DEFAULT 0,
  change_amount NUMERIC DEFAULT 0,
  payments JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own sales" ON public.sales FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Sale items table
CREATE TABLE public.sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  cost_price NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own sale items" ON public.sale_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sales s WHERE s.id = sale_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.sales s WHERE s.id = sale_id AND s.user_id = auth.uid()));

-- Employees table
CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  admin_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can manage own employees" ON public.employees FOR ALL TO authenticated USING (auth.uid() = admin_id) WITH CHECK (auth.uid() = admin_id);
CREATE POLICY "Employee can read own record" ON public.employees FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Employee permissions table
CREATE TABLE public.employee_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  permission_key TEXT NOT NULL,
  allowed BOOLEAN DEFAULT false,
  UNIQUE (employee_id, permission_key)
);

ALTER TABLE public.employee_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can manage employee permissions" ON public.employee_permissions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_id AND e.admin_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_id AND e.admin_id = auth.uid()));
CREATE POLICY "Employee can read own permissions" ON public.employee_permissions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_id AND e.user_id = auth.uid()));

-- Auri conversations table
CREATE TABLE public.auri_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.auri_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own conversations" ON public.auri_conversations FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Auri messages table
CREATE TABLE public.auri_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.auri_conversations(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.auri_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own messages" ON public.auri_messages FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.auri_conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.auri_conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid()));

-- Email verifications table
CREATE TABLE public.email_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  verified BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER DEFAULT 0,
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service can manage verifications" ON public.email_verifications FOR ALL USING (true);

-- Weekly redemption codes table
CREATE TABLE public.weekly_redemption_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  code TEXT NOT NULL,
  is_used BOOLEAN DEFAULT false,
  week_start DATE NOT NULL,
  benefit_type TEXT,
  days_added INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.weekly_redemption_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own codes" ON public.weekly_redemption_codes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Blocked CPFs table (for is_cpf_blocked function)
CREATE TABLE public.blocked_cpfs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cpf TEXT NOT NULL UNIQUE,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.blocked_cpfs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service can read blocked cpfs" ON public.blocked_cpfs FOR SELECT USING (true);

-- Invite codes table
CREATE TABLE public.invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  used_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read invite codes" ON public.invite_codes FOR SELECT USING (true);
CREATE POLICY "Users can update own codes" ON public.invite_codes FOR UPDATE TO authenticated USING (owner_user_id = auth.uid());

-- Invite IP tracking table
CREATE TABLE public.invite_ip_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_code TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.invite_ip_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service can manage ip usage" ON public.invite_ip_usage FOR ALL USING (true);

-- Function: is_cpf_blocked
CREATE OR REPLACE FUNCTION public.is_cpf_blocked(check_cpf TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.blocked_cpfs WHERE cpf = check_cpf);
$$;

-- Function: get_user_email_by_cpf
CREATE OR REPLACE FUNCTION public.get_user_email_by_cpf(search_cpf TEXT)
RETURNS TABLE(email TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.email FROM public.profiles p WHERE p.cpf = search_cpf LIMIT 1;
$$;

-- Function: validate_invite_code
CREATE OR REPLACE FUNCTION public.validate_invite_code(code TEXT)
RETURNS TABLE(is_valid BOOLEAN, is_already_used BOOLEAN)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE WHEN ic.id IS NOT NULL THEN true ELSE false END AS is_valid,
    COALESCE(ic.is_used, false) AS is_already_used
  FROM public.invite_codes ic
  WHERE ic.code = validate_invite_code.code
  LIMIT 1;
$$;

-- Function: get_profile_created_at_by_email
CREATE OR REPLACE FUNCTION public.get_profile_created_at_by_email(p_email TEXT)
RETURNS TABLE(created_at TIMESTAMPTZ)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.created_at FROM public.profiles p WHERE p.email = p_email LIMIT 1;
$$;

-- Function: has_role (security definer for RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  );
$$;

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_invite_code TEXT;
BEGIN
  -- Generate unique invite code
  new_invite_code := upper(substring(md5(random()::text) from 1 for 8));
  
  INSERT INTO public.profiles (user_id, email, full_name, cpf, phone, cep, street, number, neighborhood, city, state, invite_code, referred_by_code)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'cpf',
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'cep',
    NEW.raw_user_meta_data->>'street',
    NEW.raw_user_meta_data->>'number',
    NEW.raw_user_meta_data->>'neighborhood',
    NEW.raw_user_meta_data->>'city',
    NEW.raw_user_meta_data->>'state',
    new_invite_code,
    NEW.raw_user_meta_data->>'referred_by_code'
  );
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
