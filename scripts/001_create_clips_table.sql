-- Create clips table for storing clip metadata
create table clips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  title text not null,
  storage_path text not null,
  public_url text,
  stream_url text,
  duration_seconds int,
  created_at timestamp default now()
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
