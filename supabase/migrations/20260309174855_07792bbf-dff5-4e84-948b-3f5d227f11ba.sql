
-- Phase 3: Add business_type to store_settings
ALTER TABLE public.store_settings 
ADD COLUMN IF NOT EXISTS business_type text DEFAULT 'comercio' 
CHECK (business_type IN ('comercio', 'loja_roupas', 'delivery'));

-- Create product_variants table for clothing stores
CREATE TABLE IF NOT EXISTS public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  size text,
  color text,
  stock_quantity integer NOT NULL DEFAULT 0,
  sku text,
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL
);

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own variants" ON public.product_variants
FOR ALL TO authenticated
USING (is_owner_or_employee(user_id))
WITH CHECK (is_owner_or_employee(user_id));

-- Create delivery_orders table
CREATE TABLE IF NOT EXISTS public.delivery_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_user_id uuid NOT NULL,
  order_number serial,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_address text NOT NULL,
  payment_method text NOT NULL DEFAULT 'dinheiro',
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'preparing', 'delivering', 'delivered', 'cancelled')),
  total_amount numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.delivery_orders ENABLE ROW LEVEL SECURITY;

-- Store owner can manage their orders
CREATE POLICY "Store owner can manage delivery orders" ON public.delivery_orders
FOR ALL TO authenticated
USING (is_owner_or_employee(store_user_id))
WITH CHECK (is_owner_or_employee(store_user_id));

-- Anonymous can insert orders (public catalog checkout)
CREATE POLICY "Anyone can create delivery orders" ON public.delivery_orders
FOR INSERT TO anon
WITH CHECK (true);

-- Create delivery_order_items table
CREATE TABLE IF NOT EXISTS public.delivery_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.delivery_orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id),
  product_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  variant_info text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.delivery_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store owner can manage order items" ON public.delivery_order_items
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.delivery_orders o WHERE o.id = delivery_order_items.order_id AND is_owner_or_employee(o.store_user_id)))
WITH CHECK (EXISTS (SELECT 1 FROM public.delivery_orders o WHERE o.id = delivery_order_items.order_id AND is_owner_or_employee(o.store_user_id)));

CREATE POLICY "Anyone can insert order items" ON public.delivery_order_items
FOR INSERT TO anon
WITH CHECK (true);

-- Enable realtime for delivery orders
ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_orders;

-- Create delivery_payment_settings table
CREATE TABLE IF NOT EXISTS public.delivery_payment_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  pix_enabled boolean DEFAULT false,
  cash_enabled boolean DEFAULT true,
  card_on_delivery_enabled boolean DEFAULT false,
  mercado_pago_enabled boolean DEFAULT false,
  pix_key text,
  pix_receiver_name text,
  pix_bank text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.delivery_payment_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own delivery payment settings" ON public.delivery_payment_settings
FOR ALL TO authenticated
USING (is_owner_or_employee(user_id))
WITH CHECK (is_owner_or_employee(user_id));
