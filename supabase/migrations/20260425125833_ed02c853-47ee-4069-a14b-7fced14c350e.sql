-- Per-rank prize configuration table
CREATE TABLE IF NOT EXISTS public.test_prizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  rank_position text NOT NULL CHECK (rank_position IN ('rank1','rank2','rank3','lucky')),
  prize_type text NOT NULL CHECK (prize_type IN ('trophy','cash','gift','books','certificate','other')),
  prize_value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (test_id, rank_position)
);

CREATE INDEX IF NOT EXISTS idx_test_prizes_test ON public.test_prizes(test_id);

ALTER TABLE public.test_prizes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all test prizes"
ON public.test_prizes FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Approved students view prizes for eligible tests"
ON public.test_prizes FOR SELECT
USING (
  public.is_student_approved()
  AND EXISTS (
    SELECT 1 FROM public.test_eligible_classes ec
    JOIN public.profiles p ON p.user_id = auth.uid()
    WHERE ec.test_id = test_prizes.test_id AND ec.class = p.class
  )
);

CREATE TRIGGER update_test_prizes_updated_at
BEFORE UPDATE ON public.test_prizes
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Lucky-winner config on tests
ALTER TABLE public.tests
  ADD COLUMN IF NOT EXISTS lucky_winner_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lucky_selection_method text NOT NULL DEFAULT 'random' CHECK (lucky_selection_method IN ('random','manual'));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.test_prizes;