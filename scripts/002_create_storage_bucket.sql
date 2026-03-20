-- Create storage bucket for clips
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'clips',
  'clips',
  false,
  104857600, -- 100MB limit
  ARRAY['video/webm', 'video/mp4', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for storage bucket
-- Users can upload to their own folder
CREATE POLICY "clips_storage_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'clips' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can read their own clips
CREATE POLICY "clips_storage_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'clips' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can delete their own clips
CREATE POLICY "clips_storage_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'clips' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );
