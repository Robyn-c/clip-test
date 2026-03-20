-- Create clips table for storing clip metadata
CREATE TABLE IF NOT EXISTS public.clips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  storage_path TEXT NOT NULL,
  thumbnail_path TEXT,
  duration_seconds INTEGER DEFAULT 60,
  stream_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.clips ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own clips
CREATE POLICY "clips_select_own" ON public.clips 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "clips_insert_own" ON public.clips 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "clips_update_own" ON public.clips 
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "clips_delete_own" ON public.clips 
  FOR DELETE USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS clips_user_id_idx ON public.clips(user_id);
CREATE INDEX IF NOT EXISTS clips_created_at_idx ON public.clips(created_at DESC);
