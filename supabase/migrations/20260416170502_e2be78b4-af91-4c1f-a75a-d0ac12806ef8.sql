
-- Test Events table
CREATE TABLE public.test_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_name TEXT NOT NULL,
  description TEXT,
  test_id UUID REFERENCES public.tests(id) ON DELETE SET NULL,
  target_class TEXT,
  is_universal BOOLEAN NOT NULL DEFAULT false,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  banner_image TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  results_approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.test_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all test events"
  ON public.test_events FOR ALL
  USING (is_admin());

CREATE POLICY "Students can view relevant test events"
  ON public.test_events FOR SELECT
  USING (
    is_student_approved() AND
    status = 'active' AND
    (is_universal = true OR target_class = (SELECT class FROM profiles WHERE user_id = auth.uid()))
  );

-- Event Prizes table
CREATE TABLE public.event_prizes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.test_events(id) ON DELETE CASCADE,
  first_prize TEXT,
  second_prize TEXT,
  third_prize TEXT,
  extra_reward TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(event_id)
);

ALTER TABLE public.event_prizes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all event prizes"
  ON public.event_prizes FOR ALL
  USING (is_admin());

CREATE POLICY "Students can view event prizes"
  ON public.event_prizes FOR SELECT
  USING (is_student_approved());

-- Banners table
CREATE TABLE public.banners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  target_class TEXT,
  is_universal BOOLEAN NOT NULL DEFAULT false,
  event_id UUID REFERENCES public.test_events(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all banners"
  ON public.banners FOR ALL
  USING (is_admin());

CREATE POLICY "Students can view relevant active banners"
  ON public.banners FOR SELECT
  USING (
    is_student_approved() AND
    is_active = true AND
    (is_universal = true OR target_class = (SELECT class FROM profiles WHERE user_id = auth.uid()))
  );

-- Add is_banned to test_attempts
ALTER TABLE public.test_attempts ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT false;

-- Triggers for updated_at
CREATE TRIGGER update_test_events_updated_at
  BEFORE UPDATE ON public.test_events
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_event_prizes_updated_at
  BEFORE UPDATE ON public.event_prizes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_banners_updated_at
  BEFORE UPDATE ON public.banners
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
