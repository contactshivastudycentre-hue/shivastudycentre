-- Challenge a Friend: track share events for analytics + referral landing
CREATE TABLE public.challenge_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  test_id UUID,
  attempt_id UUID,
  score INTEGER,
  test_title TEXT,
  challenger_name TEXT,
  share_method TEXT NOT NULL DEFAULT 'native',
  referral_code TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_challenge_shares_student ON public.challenge_shares(student_id);
CREATE INDEX idx_challenge_shares_referral ON public.challenge_shares(referral_code);
CREATE INDEX idx_challenge_shares_created ON public.challenge_shares(created_at DESC);

ALTER TABLE public.challenge_shares ENABLE ROW LEVEL SECURITY;

-- Public read by referral code so landing page banner works for anon visitors
CREATE POLICY "Public can view shares by referral code"
ON public.challenge_shares
FOR SELECT
USING (true);

-- Approved students create their own shares
CREATE POLICY "Approved students create own shares"
ON public.challenge_shares
FOR INSERT
WITH CHECK (auth.uid() = student_id AND is_student_approved());

-- Admins manage all
CREATE POLICY "Admins manage all shares"
ON public.challenge_shares
FOR ALL
USING (is_admin());