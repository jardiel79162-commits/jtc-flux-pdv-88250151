
-- Add employee tracking to sales
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS employee_name text;

-- Enable realtime for employee_permissions (already may exist)
ALTER PUBLICATION supabase_realtime ADD TABLE public.employee_permissions;
