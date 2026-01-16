-- Conversations table
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'conversations') THEN
    CREATE TABLE public.conversations (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      athlete_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      coach_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      initiated_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      status TEXT DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'ARCHIVED', 'BLOCKED')),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(athlete_user_id, coach_user_id)
    );
  END IF;
END $$;

-- Messages table
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'messages') THEN
    CREATE TABLE public.messages (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
      sender_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      sender_role TEXT NOT NULL CHECK (sender_role IN ('ATHLETE', 'COACH')),
      body TEXT NOT NULL,
      read_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  END IF;
END $$;

-- Blocks table
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'blocks') THEN
    CREATE TABLE public.blocks (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      blocker_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      blocked_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      reason TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(blocker_user_id, blocked_user_id)
    );
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_conversations_athlete_user_id ON public.conversations(athlete_user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_coach_user_id ON public.conversations(coach_user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON public.conversations(status);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_user_id ON public.messages(sender_user_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocker_user_id ON public.blocks(blocker_user_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked_user_id ON public.blocks(blocked_user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at on conversations
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'conversations') THEN
    DROP TRIGGER IF EXISTS update_conversations_updated_at ON public.conversations;
    CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
