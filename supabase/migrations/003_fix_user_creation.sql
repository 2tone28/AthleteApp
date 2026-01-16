-- Fix user creation: Add trigger to automatically create user record when auth user is created
-- This ensures the user record is created even if RLS policies block direct inserts

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into public.users table
  -- Default role is 'athlete', can be updated later
  INSERT INTO public.users (id, role)
  VALUES (NEW.id, 'athlete')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function when a new auth user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Also add the INSERT policy for users table (in case trigger doesn't fire)
DROP POLICY IF EXISTS "Users can insert their own record" ON public.users;
CREATE POLICY "Users can insert their own record"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Allow service role to insert users (for seed script)
-- This is safe because service role is server-side only
CREATE POLICY "Service role can insert users"
  ON public.users FOR INSERT
  WITH CHECK (true);
