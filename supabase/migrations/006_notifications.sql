-- Notifications table
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notifications') THEN
    CREATE TABLE public.notifications (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK (type IN ('CONTACT_REQUEST', 'MESSAGE', 'SAVED_TO_SHORTLIST', 'PROFILE_VIEWED')),
      title TEXT NOT NULL,
      body TEXT,
      related_id TEXT, -- ID of related entity (conversation_id, contact_request_id, etc.)
      read_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON public.notifications(read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
