-- Create enum for question types
CREATE TYPE public.question_type AS ENUM ('mcq_single', 'mcq_multiple', 'true_false', 'short_answer', 'long_answer');

-- Add new columns to questions table
ALTER TABLE public.questions
  ADD COLUMN question_type public.question_type NOT NULL DEFAULT 'mcq_single',
  ADD COLUMN marks integer NOT NULL DEFAULT 1,
  ADD COLUMN correct_answers jsonb DEFAULT '[]'::jsonb;

-- Migrate existing correct_option_index data to correct_answers
UPDATE public.questions
SET correct_answers = jsonb_build_array(correct_option_index)
WHERE correct_option_index IS NOT NULL;

-- Add total_marks column to tests (will be computed from questions)
ALTER TABLE public.tests
  ADD COLUMN total_marks integer DEFAULT 0;

-- Create function to update test total marks
CREATE OR REPLACE FUNCTION public.update_test_total_marks()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update the total_marks for the affected test
  UPDATE public.tests
  SET total_marks = COALESCE((
    SELECT SUM(marks)
    FROM public.questions
    WHERE test_id = COALESCE(NEW.test_id, OLD.test_id)
  ), 0)
  WHERE id = COALESCE(NEW.test_id, OLD.test_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for auto-updating total marks
CREATE TRIGGER update_test_marks_on_question_change
AFTER INSERT OR UPDATE OR DELETE ON public.questions
FOR EACH ROW
EXECUTE FUNCTION public.update_test_total_marks();

-- Add mcq_score and manual_score to test_attempts for mixed evaluation
ALTER TABLE public.test_attempts
  ADD COLUMN mcq_score integer DEFAULT 0,
  ADD COLUMN manual_score integer DEFAULT NULL,
  ADD COLUMN evaluation_status text DEFAULT 'pending',
  ADD COLUMN evaluated_at timestamp with time zone DEFAULT NULL,
  ADD COLUMN evaluated_by uuid DEFAULT NULL;

-- Update RLS policies for class-based filtering on notes
DROP POLICY IF EXISTS "Approved students can view notes" ON public.notes;
CREATE POLICY "Students can view notes for their class"
  ON public.notes
  FOR SELECT
  USING (
    is_student_approved() AND
    class = (SELECT class FROM public.profiles WHERE user_id = auth.uid())
  );

-- Update RLS policies for class-based filtering on videos  
DROP POLICY IF EXISTS "Approved students can view videos" ON public.videos;
CREATE POLICY "Students can view videos for their class"
  ON public.videos
  FOR SELECT
  USING (
    is_student_approved() AND
    class = (SELECT class FROM public.profiles WHERE user_id = auth.uid())
  );

-- Update RLS policies for class-based filtering on tests
DROP POLICY IF EXISTS "Approved students can view published tests" ON public.tests;
CREATE POLICY "Students can view published tests for their class"
  ON public.tests
  FOR SELECT
  USING (
    is_published = true AND
    is_student_approved() AND
    class = (SELECT class FROM public.profiles WHERE user_id = auth.uid())
  );

-- Update RLS policies for class-based filtering on questions
DROP POLICY IF EXISTS "Approved students can view questions of published tests" ON public.questions;
CREATE POLICY "Students can view questions of their class tests"
  ON public.questions
  FOR SELECT
  USING (
    is_student_approved() AND
    EXISTS (
      SELECT 1 FROM public.tests t
      WHERE t.id = questions.test_id
        AND t.is_published = true
        AND t.class = (SELECT class FROM public.profiles WHERE user_id = auth.uid())
    )
  );