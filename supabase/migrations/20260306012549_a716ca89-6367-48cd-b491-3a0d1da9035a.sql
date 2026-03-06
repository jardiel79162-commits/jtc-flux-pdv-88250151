
-- Create storage bucket for message images
INSERT INTO storage.buckets (id, name, public)
VALUES ('message-images', 'message-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to message-images
CREATE POLICY "Authenticated users can upload message images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'message-images');

-- Allow public read
CREATE POLICY "Public read message images"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'message-images');
