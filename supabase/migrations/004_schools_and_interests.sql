-- Schools table
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'schools') THEN
    CREATE TABLE public.schools (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name TEXT NOT NULL,
      division TEXT CHECK (division IN ('NCAA D1', 'NCAA D2', 'NCAA D3', 'NAIA', 'JUCO', 'Other')),
      location TEXT,
      logo_url TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(name)
    );
  END IF;
END $$;

-- Athlete school interests
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'athlete_school_interests') THEN
    CREATE TABLE public.athlete_school_interests (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      athlete_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
      interest_type TEXT DEFAULT 'LIKE' CHECK (interest_type IN ('LIKE', 'FOLLOW', 'TOP_CHOICE')),
      visibility TEXT DEFAULT 'PUBLIC_TO_VERIFIED_COACHES' CHECK (visibility IN ('PUBLIC_TO_VERIFIED_COACHES', 'PRIVATE_UNTIL_APPROVED', 'PRIVATE')),
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(athlete_user_id, school_id)
    );
  END IF;
END $$;

-- Add school_id to coach_profiles
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'coach_profiles') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'coach_profiles' 
      AND column_name = 'school_id'
    ) THEN
      ALTER TABLE public.coach_profiles
      ADD COLUMN school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_schools_name ON public.schools(name);
CREATE INDEX IF NOT EXISTS idx_athlete_school_interests_athlete_user_id ON public.athlete_school_interests(athlete_user_id);
CREATE INDEX IF NOT EXISTS idx_athlete_school_interests_school_id ON public.athlete_school_interests(school_id);
CREATE INDEX IF NOT EXISTS idx_coach_profiles_school_id ON public.coach_profiles(school_id);
