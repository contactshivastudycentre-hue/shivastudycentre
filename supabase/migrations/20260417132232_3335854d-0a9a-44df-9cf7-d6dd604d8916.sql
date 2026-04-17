-- Track student last opened content for "Resume Learning" card
CREATE TABLE public.last_activity (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  content_type text NOT NULL CHECK (content_type IN ('test', 'video', 'note')),
  content_id uuid NOT NULL,
  content_title text,
  content_subtitle text,
  last_opened timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, content_type, content_id)
);

ALTER TABLE public.last_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activity"
  ON public.last_activity FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activity"
  ON public.last_activity FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own activity"
  ON public.last_activity FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own activity"
  ON public.last_activity FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all activity"
  ON public.last_activity FOR SELECT
  USING (is_admin());

CREATE INDEX idx_last_activity_user_opened
  ON public.last_activity (user_id, last_opened DESC);

-- Helper RPC to upsert most recent activity
CREATE OR REPLACE FUNCTION public.track_activity(
  p_content_type text,
  p_content_id uuid,
  p_title text DEFAULT NULL,
  p_subtitle text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  INSERT INTO public.last_activity (user_id, content_type, content_id, content_title, content_subtitle, last_opened)
  VALUES (auth.uid(), p_content_type, p_content_id, p_title, p_subtitle, now())
  ON CONFLICT (user_id, content_type, content_id)
  DO UPDATE SET last_opened = now(),
                content_title = EXCLUDED.content_title,
                content_subtitle = EXCLUDED.content_subtitle;
END;
$$;