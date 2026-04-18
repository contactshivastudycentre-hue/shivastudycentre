-- Add new test types to enum
ALTER TYPE public.test_type_enum ADD VALUE IF NOT EXISTS 'weekly';
ALTER TYPE public.test_type_enum ADD VALUE IF NOT EXISTS 'mock';
ALTER TYPE public.test_type_enum ADD VALUE IF NOT EXISTS 'surprise_quiz';