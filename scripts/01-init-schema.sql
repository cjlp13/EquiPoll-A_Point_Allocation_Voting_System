-- Create profiles table to extend auth.users
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create polls table
CREATE TABLE IF NOT EXISTS polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create poll choices table
CREATE TABLE IF NOT EXISTS poll_choices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  choice_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create votes table (stores point allocations)
CREATE TABLE IF NOT EXISTS votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  choice_id UUID NOT NULL REFERENCES poll_choices(id) ON DELETE CASCADE,
  points NUMERIC(5, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(poll_id, user_id, choice_id)
);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_choices ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Profiles RLS policies
CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Public can view all profiles" ON profiles FOR SELECT USING (TRUE);

-- Polls RLS policies (public read, user write for own polls)
CREATE POLICY "Anyone can view polls" ON polls FOR SELECT USING (TRUE);
CREATE POLICY "Users can create polls" ON polls FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own polls" ON polls FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own polls" ON polls FOR DELETE USING (auth.uid() = user_id);

-- Poll choices RLS policies
CREATE POLICY "Anyone can view poll choices" ON poll_choices FOR SELECT USING (TRUE);
CREATE POLICY "Poll creator can insert choices" ON poll_choices FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM polls WHERE polls.id = poll_choices.poll_id AND polls.user_id = auth.uid()
    )
  );
CREATE POLICY "Poll creator can update choices" ON poll_choices FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM polls WHERE polls.id = poll_choices.poll_id AND polls.user_id = auth.uid()
    )
  );
CREATE POLICY "Poll creator can delete choices" ON poll_choices FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM polls WHERE polls.id = poll_choices.poll_id AND polls.user_id = auth.uid()
    )
  );

-- Votes RLS policies (users can only vote on their own account, view own votes)
CREATE POLICY "Users can insert their own votes" ON votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own votes" ON votes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own votes" ON votes FOR SELECT USING (auth.uid() = user_id);
