-- Helper function to check if user is a verified coach
CREATE OR REPLACE FUNCTION is_verified_coach(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.coach_profiles
    WHERE coach_profiles.user_id = is_verified_coach.user_id
    AND coach_profiles.verification_status = 'verified'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing policies if they exist (allows re-running this migration)
DO $$ 
BEGIN
  -- Drop schools policies
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'schools') THEN
    DROP POLICY IF EXISTS "Anyone can view schools" ON public.schools;
  END IF;

  -- Drop athlete_school_interests policies
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'athlete_school_interests') THEN
    DROP POLICY IF EXISTS "Athletes can view their own interests" ON public.athlete_school_interests;
    DROP POLICY IF EXISTS "Verified coaches can view public interests" ON public.athlete_school_interests;
    DROP POLICY IF EXISTS "Coaches can view interests for their school if approved" ON public.athlete_school_interests;
    DROP POLICY IF EXISTS "Athletes can manage their own interests" ON public.athlete_school_interests;
  END IF;

  -- Drop conversations policies
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'conversations') THEN
    DROP POLICY IF EXISTS "Participants can view their conversations" ON public.conversations;
    DROP POLICY IF EXISTS "Only verified coaches can create conversations" ON public.conversations;
    DROP POLICY IF EXISTS "Participants can update their conversations" ON public.conversations;
  END IF;

  -- Drop messages policies
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'messages') THEN
    DROP POLICY IF EXISTS "Participants can view messages in their conversations" ON public.messages;
    DROP POLICY IF EXISTS "Athletes can send messages in open conversations they're part of" ON public.messages;
    DROP POLICY IF EXISTS "Coaches can send messages in open conversations they're part of" ON public.messages;
    DROP POLICY IF EXISTS "Participants can update their own messages" ON public.messages;
  END IF;

  -- Drop blocks policies
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'blocks') THEN
    DROP POLICY IF EXISTS "Users can view blocks they created" ON public.blocks;
    DROP POLICY IF EXISTS "Users can create blocks" ON public.blocks;
    DROP POLICY IF EXISTS "Users can delete their own blocks" ON public.blocks;
  END IF;

  -- Drop notifications policies
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notifications') THEN
    DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
    DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
    DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
  END IF;
END $$;

-- Enable RLS on new tables (only if tables exist)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'schools') THEN
    ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'athlete_school_interests') THEN
    ALTER TABLE public.athlete_school_interests ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'conversations') THEN
    ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'messages') THEN
    ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'blocks') THEN
    ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notifications') THEN
    ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Schools policies (public read, admin write)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'schools') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'schools' 
      AND policyname = 'Anyone can view schools'
    ) THEN
      CREATE POLICY "Anyone can view schools"
        ON public.schools FOR SELECT
        USING (true);
    END IF;
  END IF;
END $$;

-- Athlete school interests policies
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'athlete_school_interests') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'athlete_school_interests' AND policyname = 'Athletes can view their own interests') THEN
      CREATE POLICY "Athletes can view their own interests"
        ON public.athlete_school_interests FOR SELECT
        USING (auth.uid() = athlete_user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'athlete_school_interests' AND policyname = 'Verified coaches can view public interests') THEN
      CREATE POLICY "Verified coaches can view public interests"
        ON public.athlete_school_interests FOR SELECT
        USING (
          visibility = 'PUBLIC_TO_VERIFIED_COACHES'
          AND is_verified_coach(auth.uid())
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'athlete_school_interests' AND policyname = 'Coaches can view interests for their school if approved') THEN
      CREATE POLICY "Coaches can view interests for their school if approved"
        ON public.athlete_school_interests FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM public.coach_profiles cp
            WHERE cp.user_id = auth.uid()
            AND cp.school_id = athlete_school_interests.school_id
            AND cp.verification_status = 'verified'
          )
          AND (
            visibility = 'PUBLIC_TO_VERIFIED_COACHES'
            OR visibility = 'PRIVATE_UNTIL_APPROVED'
          )
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'athlete_school_interests' AND policyname = 'Athletes can manage their own interests') THEN
      CREATE POLICY "Athletes can manage their own interests"
        ON public.athlete_school_interests FOR ALL
        USING (auth.uid() = athlete_user_id);
    END IF;
  END IF;
END $$;

-- Conversations policies
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'conversations') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'conversations' AND policyname = 'Participants can view their conversations') THEN
      CREATE POLICY "Participants can view their conversations"
        ON public.conversations FOR SELECT
        USING (
          auth.uid() = athlete_user_id
          OR auth.uid() = coach_user_id
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'conversations' AND policyname = 'Only verified coaches can create conversations') THEN
      CREATE POLICY "Only verified coaches can create conversations"
        ON public.conversations FOR INSERT
        WITH CHECK (
          auth.uid() = coach_user_id
          AND auth.uid() = initiated_by
          AND is_verified_coach(auth.uid())
          AND NOT EXISTS (
            SELECT 1 FROM public.blocks
            WHERE (blocker_user_id = athlete_user_id AND blocked_user_id = auth.uid())
            OR (blocker_user_id = auth.uid() AND blocked_user_id = athlete_user_id)
          )
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'conversations' AND policyname = 'Participants can update their conversations') THEN
      CREATE POLICY "Participants can update their conversations"
        ON public.conversations FOR UPDATE
        USING (
          auth.uid() = athlete_user_id
          OR auth.uid() = coach_user_id
        );
    END IF;
  END IF;
END $$;

-- Messages policies
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'messages') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'messages' AND policyname = 'Participants can view messages in their conversations') THEN
      CREATE POLICY "Participants can view messages in their conversations"
        ON public.messages FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM public.conversations
            WHERE conversations.id = messages.conversation_id
            AND (
              conversations.athlete_user_id = auth.uid()
              OR conversations.coach_user_id = auth.uid()
            )
          )
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'messages' AND policyname = 'Athletes can send messages in open conversations they''re part of') THEN
      CREATE POLICY "Athletes can send messages in open conversations they're part of"
        ON public.messages FOR INSERT
        WITH CHECK (
          sender_role = 'ATHLETE'
          AND sender_user_id = auth.uid()
          AND EXISTS (
            SELECT 1 FROM public.conversations
            WHERE conversations.id = messages.conversation_id
            AND conversations.athlete_user_id = auth.uid()
            AND conversations.status = 'OPEN'
          )
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'messages' AND policyname = 'Coaches can send messages in open conversations they''re part of') THEN
      CREATE POLICY "Coaches can send messages in open conversations they're part of"
        ON public.messages FOR INSERT
        WITH CHECK (
          sender_role = 'COACH'
          AND sender_user_id = auth.uid()
          AND is_verified_coach(auth.uid())
          AND EXISTS (
            SELECT 1 FROM public.conversations
            WHERE conversations.id = messages.conversation_id
            AND conversations.coach_user_id = auth.uid()
            AND conversations.status = 'OPEN'
          )
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'messages' AND policyname = 'Participants can update their own messages') THEN
      CREATE POLICY "Participants can update their own messages"
        ON public.messages FOR UPDATE
        USING (sender_user_id = auth.uid());
    END IF;
  END IF;
END $$;

-- Blocks policies
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'blocks') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'blocks' AND policyname = 'Users can view blocks they created') THEN
      CREATE POLICY "Users can view blocks they created"
        ON public.blocks FOR SELECT
        USING (auth.uid() = blocker_user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'blocks' AND policyname = 'Users can create blocks') THEN
      CREATE POLICY "Users can create blocks"
        ON public.blocks FOR INSERT
        WITH CHECK (auth.uid() = blocker_user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'blocks' AND policyname = 'Users can delete their own blocks') THEN
      CREATE POLICY "Users can delete their own blocks"
        ON public.blocks FOR DELETE
        USING (auth.uid() = blocker_user_id);
    END IF;
  END IF;
END $$;

-- Notifications policies
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notifications') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notifications' AND policyname = 'Users can view their own notifications') THEN
      CREATE POLICY "Users can view their own notifications"
        ON public.notifications FOR SELECT
        USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notifications' AND policyname = 'System can create notifications') THEN
      CREATE POLICY "System can create notifications"
        ON public.notifications FOR INSERT
        WITH CHECK (true); -- Will be controlled by service role in practice
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notifications' AND policyname = 'Users can update their own notifications') THEN
      CREATE POLICY "Users can update their own notifications"
        ON public.notifications FOR UPDATE
        USING (auth.uid() = user_id);
    END IF;
  END IF;
END $$;
