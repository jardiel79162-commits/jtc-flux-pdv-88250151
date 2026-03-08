
-- Security definer function: checks if the current user is the owner OR an active employee of the owner
CREATE OR REPLACE FUNCTION public.is_owner_or_employee(_owner_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    auth.uid() = _owner_id
    OR EXISTS (
      SELECT 1 FROM public.employees
      WHERE user_id = auth.uid()
        AND admin_id = _owner_id
        AND is_active = true
    )
  );
$$;

-- Update RLS for products: owner or employee of owner
DROP POLICY IF EXISTS "Users can manage own products" ON public.products;
CREATE POLICY "Users can manage own products" ON public.products
  FOR ALL TO authenticated
  USING (public.is_owner_or_employee(user_id))
  WITH CHECK (public.is_owner_or_employee(user_id));

-- Update RLS for customers
DROP POLICY IF EXISTS "Users can manage own customers" ON public.customers;
CREATE POLICY "Users can manage own customers" ON public.customers
  FOR ALL TO authenticated
  USING (public.is_owner_or_employee(user_id))
  WITH CHECK (public.is_owner_or_employee(user_id));

-- Update RLS for suppliers
DROP POLICY IF EXISTS "Users can manage own suppliers" ON public.suppliers;
CREATE POLICY "Users can manage own suppliers" ON public.suppliers
  FOR ALL TO authenticated
  USING (public.is_owner_or_employee(user_id))
  WITH CHECK (public.is_owner_or_employee(user_id));

-- Update RLS for sales
DROP POLICY IF EXISTS "Users can manage own sales" ON public.sales;
CREATE POLICY "Users can manage own sales" ON public.sales
  FOR ALL TO authenticated
  USING (public.is_owner_or_employee(user_id))
  WITH CHECK (public.is_owner_or_employee(user_id));

-- Update RLS for sale_items (uses join to sales)
DROP POLICY IF EXISTS "Users can manage own sale items" ON public.sale_items;
CREATE POLICY "Users can manage own sale items" ON public.sale_items
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.sales s
    WHERE s.id = sale_items.sale_id
      AND public.is_owner_or_employee(s.user_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.sales s
    WHERE s.id = sale_items.sale_id
      AND public.is_owner_or_employee(s.user_id)
  ));

-- Update RLS for categories
DROP POLICY IF EXISTS "Users can manage own categories" ON public.categories;
CREATE POLICY "Users can manage own categories" ON public.categories
  FOR ALL TO authenticated
  USING (public.is_owner_or_employee(user_id))
  WITH CHECK (public.is_owner_or_employee(user_id));

-- Update RLS for store_settings
DROP POLICY IF EXISTS "Users can manage own store settings" ON public.store_settings;
CREATE POLICY "Users can manage own store settings" ON public.store_settings
  FOR ALL TO authenticated
  USING (public.is_owner_or_employee(user_id))
  WITH CHECK (public.is_owner_or_employee(user_id));

-- Update RLS for customer_transactions
DROP POLICY IF EXISTS "Users can manage own customer transactions" ON public.customer_transactions;
CREATE POLICY "Users can manage own customer transactions" ON public.customer_transactions
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.id = customer_transactions.customer_id
      AND public.is_owner_or_employee(c.user_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.id = customer_transactions.customer_id
      AND public.is_owner_or_employee(c.user_id)
  ));

-- Update RLS for product_images
DROP POLICY IF EXISTS "Users can manage own product images" ON public.product_images;
CREATE POLICY "Users can manage own product images" ON public.product_images
  FOR ALL TO authenticated
  USING (public.is_owner_or_employee(user_id))
  WITH CHECK (public.is_owner_or_employee(user_id));

-- Update RLS for purchase_items
DROP POLICY IF EXISTS "Users can manage own purchase items" ON public.purchase_items;
CREATE POLICY "Users can manage own purchase items" ON public.purchase_items
  FOR ALL TO authenticated
  USING (public.is_owner_or_employee(user_id))
  WITH CHECK (public.is_owner_or_employee(user_id));

-- Update RLS for email_logs
DROP POLICY IF EXISTS "Users can manage own email logs" ON public.email_logs;
CREATE POLICY "Users can manage own email logs" ON public.email_logs
  FOR ALL TO authenticated
  USING (public.is_owner_or_employee(user_id))
  WITH CHECK (public.is_owner_or_employee(user_id));

-- Update RLS for store_integrations
DROP POLICY IF EXISTS "Users can manage own integrations" ON public.store_integrations;
CREATE POLICY "Users can manage own integrations" ON public.store_integrations
  FOR ALL TO authenticated
  USING (public.is_owner_or_employee(user_id))
  WITH CHECK (public.is_owner_or_employee(user_id));
