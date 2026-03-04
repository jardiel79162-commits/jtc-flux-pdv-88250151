
-- Create store-logos bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('store-logos', 'store-logos', true) ON CONFLICT (id) DO NOTHING;

-- Create product-photos bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('product-photos', 'product-photos', true) ON CONFLICT (id) DO NOTHING;

-- RLS policies for store-logos
CREATE POLICY "Users can upload their own logos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'store-logos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update their own logos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'store-logos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their own logos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'store-logos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Anyone can view logos" ON storage.objects FOR SELECT TO public USING (bucket_id = 'store-logos');

-- RLS policies for product-photos
CREATE POLICY "Users can upload product photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'product-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update product photos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'product-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete product photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'product-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Anyone can view product photos" ON storage.objects FOR SELECT TO public USING (bucket_id = 'product-photos');
