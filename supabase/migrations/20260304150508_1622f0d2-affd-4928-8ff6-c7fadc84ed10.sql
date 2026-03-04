
-- Add product_name to purchase_items
ALTER TABLE public.purchase_items ADD COLUMN product_name TEXT;

NOTIFY pgrst, 'reload schema';
