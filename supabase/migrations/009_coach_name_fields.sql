-- Add first_name and last_name to coach_profiles
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'coach_profiles') THEN
    -- Add first_name field
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'coach_profiles' 
      AND column_name = 'first_name'
    ) THEN
      ALTER TABLE public.coach_profiles
      ADD COLUMN first_name TEXT;
    END IF;

    -- Add last_name field
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'coach_profiles' 
      AND column_name = 'last_name'
    ) THEN
      ALTER TABLE public.coach_profiles
      ADD COLUMN last_name TEXT;
    END IF;
  END IF;
END $$;
