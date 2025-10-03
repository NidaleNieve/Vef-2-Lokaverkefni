-- Avatar Table for Supabase
-- Your classmate needs to run this SQL in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS user_avatars (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  avatar_seed TEXT NOT NULL DEFAULT 'John',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE user_avatars ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own avatar" ON user_avatars
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own avatar" ON user_avatars
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own avatar" ON user_avatars
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Auto-create avatar on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user_avatar()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_avatars (user_id, avatar_seed)
  VALUES (NEW.id, 'John');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_avatar ON auth.users;
CREATE TRIGGER on_auth_user_created_avatar
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_avatar();