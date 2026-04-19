ALTER TABLE public.last_activity REPLICA IDENTITY FULL;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'last_activity'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.last_activity;
  END IF;
END $$;