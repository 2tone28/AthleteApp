-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('athlete', 'coach', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Athlete profiles
CREATE TABLE public.athlete_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  sport TEXT,
  positions TEXT[],
  grad_year INTEGER,
  city TEXT,
  state TEXT,
  bio TEXT,
  -- Academics
  gpa NUMERIC(3,2),
  sat_score INTEGER,
  act_score INTEGER,
  -- Physical attributes
  height_feet INTEGER,
  height_inches INTEGER,
  weight INTEGER,
  -- Metadata
  profile_completeness INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Coach profiles
CREATE TABLE public.coach_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  school TEXT,
  title TEXT,
  sports TEXT[],
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  verification_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Athlete highlights
CREATE TABLE public.athlete_highlights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  athlete_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Athlete stats
CREATE TABLE public.athlete_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  athlete_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  season TEXT NOT NULL,
  stat_key TEXT NOT NULL,
  stat_value TEXT NOT NULL,
  source_type TEXT DEFAULT 'self_reported' CHECK (source_type IN ('self_reported', 'source_link', 'upload', 'verified')),
  source_url TEXT,
  verification_status TEXT DEFAULT 'self_reported' CHECK (verification_status IN ('self_reported', 'source_provided', 'verified')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Saved athletes (coach shortlist)
CREATE TABLE public.saved_athletes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coach_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  athlete_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(coach_user_id, athlete_user_id)
);

-- Contact requests
CREATE TABLE public.contact_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coach_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  athlete_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Discussion threads
CREATE TABLE public.discussions_threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_hidden BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Discussion posts
CREATE TABLE public.discussions_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID NOT NULL REFERENCES public.discussions_threads(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  is_hidden BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reports
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('post', 'thread', 'user', 'profile')),
  target_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_athlete_profiles_user_id ON public.athlete_profiles(user_id);
CREATE INDEX idx_athlete_profiles_sport ON public.athlete_profiles(sport);
CREATE INDEX idx_athlete_profiles_grad_year ON public.athlete_profiles(grad_year);
CREATE INDEX idx_athlete_profiles_state ON public.athlete_profiles(state);
CREATE INDEX idx_athlete_profiles_positions ON public.athlete_profiles USING GIN(positions);
CREATE INDEX idx_athlete_profiles_is_public ON public.athlete_profiles(is_public);
CREATE INDEX idx_coach_profiles_user_id ON public.coach_profiles(user_id);
CREATE INDEX idx_coach_profiles_verification_status ON public.coach_profiles(verification_status);
CREATE INDEX idx_athlete_highlights_athlete_user_id ON public.athlete_highlights(athlete_user_id);
CREATE INDEX idx_athlete_stats_athlete_user_id ON public.athlete_stats(athlete_user_id);
CREATE INDEX idx_saved_athletes_coach_user_id ON public.saved_athletes(coach_user_id);
CREATE INDEX idx_contact_requests_athlete_user_id ON public.contact_requests(athlete_user_id);
CREATE INDEX idx_contact_requests_coach_user_id ON public.contact_requests(coach_user_id);
CREATE INDEX idx_discussions_threads_created_at ON public.discussions_threads(created_at DESC);
CREATE INDEX idx_discussions_posts_thread_id ON public.discussions_posts(thread_id);
CREATE INDEX idx_reports_status ON public.reports(status);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_athlete_profiles_updated_at BEFORE UPDATE ON public.athlete_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_coach_profiles_updated_at BEFORE UPDATE ON public.coach_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
