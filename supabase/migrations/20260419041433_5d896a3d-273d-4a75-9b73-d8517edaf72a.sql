DROP POLICY IF EXISTS "Students can view relevant active banners" ON public.banners;

CREATE POLICY "Students can view relevant active banners"
ON public.banners
FOR SELECT
USING (
  is_student_approved()
  AND is_active = true
  AND (end_date IS NULL OR end_date >= now())
  AND (
    -- For test announcement banners, show even before start_date so students see "Upcoming"
    template = 'test_announcement'
    OR (start_date IS NULL OR start_date <= now())
  )
  AND (
    is_universal = true
    OR target_class = (SELECT profiles.class FROM profiles WHERE profiles.user_id = auth.uid())
  )
);