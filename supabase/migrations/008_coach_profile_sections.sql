-- Add "What We Are Looking For" and "Camps I Will Be At" sections to coach profiles
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'coach_profiles') THEN
    -- Add "what we are looking for" field
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'coach_profiles' 
      AND column_name = 'what_we_are_looking_for'
    ) THEN
      ALTER TABLE public.coach_profiles
      ADD COLUMN what_we_are_looking_for TEXT;
    END IF;

    -- Add "camps I will be at" field (stored as JSONB array for flexibility)
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'coach_profiles' 
      AND column_name = 'camps'
    ) THEN
      ALTER TABLE public.coach_profiles
      ADD COLUMN camps JSONB DEFAULT '[]'::jsonb;
    END IF;
  END IF;
END $$;
