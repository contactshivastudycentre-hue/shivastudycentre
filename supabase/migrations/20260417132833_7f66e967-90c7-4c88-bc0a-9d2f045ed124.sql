-- Banner scheduling
ALTER TABLE public.banners
  ADD COLUMN IF NOT EXISTS start_date timestamp with time zone,
  ADD COLUMN IF NOT EXISTS end_date   timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_banners_active_priority
  ON public.banners (is_active, priority DESC);

-- Replace student SELECT policy to honour date window
DROP POLICY IF EXISTS "Students can view relevant active banners" ON public.banners;

CREATE POLICY "Students can view relevant active banners"
ON public.banners
FOR SELECT
USING (
  is_student_approved()
  AND is_active = true
  AND (start_date IS NULL OR start_date <= now())
  AND (end_date   IS NULL OR end_date   >= now())
  AND (
    is_universal = true
    OR target_class = (SELECT class FROM public.profiles WHERE user_id = auth.uid())
  )
);