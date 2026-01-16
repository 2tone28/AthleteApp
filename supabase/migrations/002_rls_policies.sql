-- Enable Row Level Security on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athlete_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athlete_highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athlete_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_athletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussions_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussions_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is verified coach
CREATE OR REPLACE FUNCTION is_verified_coach(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.coach_profiles
    WHERE coach_profiles.user_id = is_verified_coach.user_id
    AND verification_status = 'verified'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = is_admin.user_id
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing policies if they exist (allows re-running this migration)
DROP POLICY IF EXISTS "Users can read their own record" ON public.users;
DROP POLICY IF EXISTS "Users can update their own record" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own record" ON public.users;
DROP POLICY IF EXISTS "Public can view public athlete profiles" ON public.athlete_profiles;
DROP POLICY IF EXISTS "Athletes can view their own profile" ON public.athlete_profiles;
DROP POLICY IF EXISTS "Verified coaches can view all athlete profiles" ON public.athlete_profiles;
DROP POLICY IF EXISTS "Athletes can insert their own profile" ON public.athlete_profiles;
DROP POLICY IF EXISTS "Athletes can update their own profile" ON public.athlete_profiles;
DROP POLICY IF EXISTS "Anyone can view verified coach profiles" ON public.coach_profiles;
DROP POLICY IF EXISTS "Coaches can insert their own profile" ON public.coach_profiles;
DROP POLICY IF EXISTS "Coaches can update their own profile" ON public.coach_profiles;
DROP POLICY IF EXISTS "Admins can update any coach profile" ON public.coach_profiles;
DROP POLICY IF EXISTS "Public can view highlights of public profiles" ON public.athlete_highlights;
DROP POLICY IF EXISTS "Athletes can manage their own highlights" ON public.athlete_highlights;
DROP POLICY IF EXISTS "Verified coaches can view all highlights" ON public.athlete_highlights;
DROP POLICY IF EXISTS "Public can view stats of public profiles" ON public.athlete_stats;
DROP POLICY IF EXISTS "Athletes can manage their own stats" ON public.athlete_stats;
DROP POLICY IF EXISTS "Verified coaches can view all stats" ON public.athlete_stats;
DROP POLICY IF EXISTS "Coaches can view their saved athletes" ON public.saved_athletes;
DROP POLICY IF EXISTS "Coaches can save athletes" ON public.saved_athletes;
DROP POLICY IF EXISTS "Coaches can remove saved athletes" ON public.saved_athletes;
DROP POLICY IF EXISTS "Athletes can view requests to them" ON public.contact_requests;
DROP POLICY IF EXISTS "Coaches can view their own requests" ON public.contact_requests;
DROP POLICY IF EXISTS "Verified coaches can create contact requests" ON public.contact_requests;
DROP POLICY IF EXISTS "Athletes can update requests to them" ON public.contact_requests;
DROP POLICY IF EXISTS "Anyone authenticated can view non-hidden threads" ON public.discussions_threads;
DROP POLICY IF EXISTS "Authenticated users can create threads" ON public.discussions_threads;
DROP POLICY IF EXISTS "Users can update their own threads" ON public.discussions_threads;
DROP POLICY IF EXISTS "Admins can update any thread" ON public.discussions_threads;
DROP POLICY IF EXISTS "Anyone authenticated can view non-hidden posts" ON public.discussions_posts;
DROP POLICY IF EXISTS "Authenticated users can create posts" ON public.discussions_posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON public.discussions_posts;
DROP POLICY IF EXISTS "Admins can update any post" ON public.discussions_posts;
DROP POLICY IF EXISTS "Users can view their own reports" ON public.reports;
DROP POLICY IF EXISTS "Admins can view all reports" ON public.reports;
DROP POLICY IF EXISTS "Authenticated users can create reports" ON public.reports;
DROP POLICY IF EXISTS "Admins can update reports" ON public.reports;

-- Users table policies
CREATE POLICY "Users can read their own record"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own record"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own record"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- Athlete profiles policies
CREATE POLICY "Public can view public athlete profiles"
  ON public.athlete_profiles FOR SELECT
  USING (is_public = true);

CREATE POLICY "Athletes can view their own profile"
  ON public.athlete_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Verified coaches can view all athlete profiles"
  ON public.athlete_profiles FOR SELECT
  USING (is_verified_coach(auth.uid()));

CREATE POLICY "Athletes can insert their own profile"
  ON public.athlete_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Athletes can update their own profile"
  ON public.athlete_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Coach profiles policies
CREATE POLICY "Anyone can view verified coach profiles"
  ON public.coach_profiles FOR SELECT
  USING (verification_status = 'verified' OR auth.uid() = user_id);

CREATE POLICY "Coaches can insert their own profile"
  ON public.coach_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Coaches can update their own profile"
  ON public.coach_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can update any coach profile"
  ON public.coach_profiles FOR UPDATE
  USING (is_admin(auth.uid()));

-- Athlete highlights policies
CREATE POLICY "Public can view highlights of public profiles"
  ON public.athlete_highlights FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.athlete_profiles
      WHERE athlete_profiles.user_id = athlete_highlights.athlete_user_id
      AND athlete_profiles.is_public = true
    )
  );

CREATE POLICY "Athletes can manage their own highlights"
  ON public.athlete_highlights FOR ALL
  USING (auth.uid() = athlete_user_id);

CREATE POLICY "Verified coaches can view all highlights"
  ON public.athlete_highlights FOR SELECT
  USING (is_verified_coach(auth.uid()));

-- Athlete stats policies
CREATE POLICY "Public can view stats of public profiles"
  ON public.athlete_stats FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.athlete_profiles
      WHERE athlete_profiles.user_id = athlete_stats.athlete_user_id
      AND athlete_profiles.is_public = true
    )
  );

CREATE POLICY "Athletes can manage their own stats"
  ON public.athlete_stats FOR ALL
  USING (auth.uid() = athlete_user_id);

CREATE POLICY "Verified coaches can view all stats"
  ON public.athlete_stats FOR SELECT
  USING (is_verified_coach(auth.uid()));

-- Saved athletes policies
CREATE POLICY "Coaches can view their saved athletes"
  ON public.saved_athletes FOR SELECT
  USING (auth.uid() = coach_user_id);

CREATE POLICY "Coaches can save athletes"
  ON public.saved_athletes FOR INSERT
  WITH CHECK (auth.uid() = coach_user_id);

CREATE POLICY "Coaches can remove saved athletes"
  ON public.saved_athletes FOR DELETE
  USING (auth.uid() = coach_user_id);

-- Contact requests policies
CREATE POLICY "Athletes can view requests to them"
  ON public.contact_requests FOR SELECT
  USING (auth.uid() = athlete_user_id);

CREATE POLICY "Coaches can view their own requests"
  ON public.contact_requests FOR SELECT
  USING (auth.uid() = coach_user_id);

CREATE POLICY "Verified coaches can create contact requests"
  ON public.contact_requests FOR INSERT
  WITH CHECK (
    auth.uid() = coach_user_id
    AND is_verified_coach(auth.uid())
  );

CREATE POLICY "Athletes can update requests to them"
  ON public.contact_requests FOR UPDATE
  USING (auth.uid() = athlete_user_id);

-- Discussion threads policies
CREATE POLICY "Anyone authenticated can view non-hidden threads"
  ON public.discussions_threads FOR SELECT
  USING (is_hidden = false OR auth.uid() = created_by OR is_admin(auth.uid()));

CREATE POLICY "Authenticated users can create threads"
  ON public.discussions_threads FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own threads"
  ON public.discussions_threads FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Admins can update any thread"
  ON public.discussions_threads FOR UPDATE
  USING (is_admin(auth.uid()));

-- Discussion posts policies
CREATE POLICY "Anyone authenticated can view non-hidden posts"
  ON public.discussions_posts FOR SELECT
  USING (
    is_hidden = false
    OR auth.uid() = created_by
    OR is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.discussions_threads
      WHERE discussions_threads.id = discussions_posts.thread_id
      AND (discussions_threads.is_hidden = false OR discussions_threads.created_by = auth.uid())
    )
  );

CREATE POLICY "Authenticated users can create posts"
  ON public.discussions_posts FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own posts"
  ON public.discussions_posts FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Admins can update any post"
  ON public.discussions_posts FOR UPDATE
  USING (is_admin(auth.uid()));

-- Reports policies
CREATE POLICY "Users can view their own reports"
  ON public.reports FOR SELECT
  USING (auth.uid() = reporter_id);

CREATE POLICY "Admins can view all reports"
  ON public.reports FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Authenticated users can create reports"
  ON public.reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Admins can update reports"
  ON public.reports FOR UPDATE
  USING (is_admin(auth.uid()));
