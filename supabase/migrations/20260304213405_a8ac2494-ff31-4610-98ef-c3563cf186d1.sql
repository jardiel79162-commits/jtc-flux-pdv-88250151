
CREATE POLICY "Authenticated users can upload to product-photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-photos');

CREATE POLICY "Authenticated users can update own files in product-photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'product-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Anyone can read product-photos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'product-photos');
