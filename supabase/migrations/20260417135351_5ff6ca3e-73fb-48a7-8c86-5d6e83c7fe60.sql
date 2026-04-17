-- 1. Add event_type to test_events
ALTER TABLE public.test_events
ADD COLUMN IF NOT EXISTS event_type text NOT NULL DEFAULT 'standard';

ALTER TABLE public.test_events
DROP CONSTRAINT IF EXISTS test_events_event_type_check;

ALTER TABLE public.test_events
ADD CONSTRAINT test_events_event_type_check
CHECK (event_type IN ('standard', 'sunday_special'));

-- 2. Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  read_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id) WHERE read_at IS NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own notifications" ON public.notifications;
CREATE POLICY "Users view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own notifications" ON public.notifications;
CREATE POLICY "Users delete own notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins manage all notifications" ON public.notifications;
CREATE POLICY "Admins manage all notifications"
  ON public.notifications FOR ALL
  USING (public.is_admin());

-- Enable realtime
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications';
  END IF;
END $$;

-- 3. Helper: fan-out notify class
CREATE OR REPLACE FUNCTION public.notify_class(
  p_class text,
  p_type text,
  p_title text,
  p_body text DEFAULT NULL,
  p_link text DEFAULT NULL
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, link)
  SELECT p.user_id, p_type, p_title, p_body, p_link
  FROM public.profiles p
  WHERE p.status = 'approved'
    AND p.mobile <> '0000000000'
    AND lower(p.full_name) <> 'admin'
    AND (p_class IS NULL OR p.class = p_class);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- 4. Trigger: new test_event scheduled
CREATE OR REPLACE FUNCTION public.notify_on_test_event_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target text;
  v_title text;
  v_body text;
  v_link text;
BEGIN
  v_target := CASE WHEN NEW.is_universal THEN NULL ELSE NEW.target_class END;
  v_link := '/dashboard';

  IF TG_OP = 'INSERT' THEN
    IF NEW.event_type = 'sunday_special' THEN
      v_title := '🏆 Sunday Special Test scheduled';
      v_body := COALESCE(NEW.event_name, 'New event') || ' — starts ' || to_char(NEW.start_date, 'Dy DD Mon, HH24:MI');
    ELSE
      v_title := '📝 New test event';
      v_body := COALESCE(NEW.event_name, 'New event');
    END IF;
    PERFORM public.notify_class(v_target, 'event_scheduled', v_title, v_body, v_link);

  ELSIF TG_OP = 'UPDATE' THEN
    IF (OLD.results_approved IS DISTINCT FROM NEW.results_approved) AND NEW.results_approved = true THEN
      v_title := '🏅 Results published';
      v_body := COALESCE(NEW.event_name, 'Event') || ' — view leaderboard now';
      v_link := '/dashboard/leaderboard/' || NEW.id::text;
      PERFORM public.notify_class(v_target, 'results_published', v_title, v_body, v_link);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_test_event_insert ON public.test_events;
CREATE TRIGGER trg_notify_test_event_insert
AFTER INSERT ON public.test_events
FOR EACH ROW EXECUTE FUNCTION public.notify_on_test_event_change();

DROP TRIGGER IF EXISTS trg_notify_test_event_update ON public.test_events;
CREATE TRIGGER trg_notify_test_event_update
AFTER UPDATE ON public.test_events
FOR EACH ROW EXECUTE FUNCTION public.notify_on_test_event_change();

-- 5. Trigger: new notes uploaded
CREATE OR REPLACE FUNCTION public.notify_on_new_note()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.notify_class(
    NEW.class,
    'new_note',
    '📚 New notes uploaded',
    COALESCE(NEW.subject, '') || ' — ' || COALESCE(NEW.title, 'Untitled'),
    '/dashboard/notes'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_note ON public.notes;
CREATE TRIGGER trg_notify_new_note
AFTER INSERT ON public.notes
FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_note();

-- 6. Trigger: new video uploaded
CREATE OR REPLACE FUNCTION public.notify_on_new_video()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.notify_class(
    NEW.class,
    'new_video',
    '🎬 New video uploaded',
    COALESCE(NEW.subject, '') || ' — ' || COALESCE(NEW.title, 'Untitled'),
    '/dashboard/videos/' || NEW.id::text
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_video ON public.videos;
CREATE TRIGGER trg_notify_new_video
AFTER INSERT ON public.videos
FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_video();