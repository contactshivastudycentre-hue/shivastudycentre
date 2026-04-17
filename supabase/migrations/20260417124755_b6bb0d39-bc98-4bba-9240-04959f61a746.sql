-- Add new fields for richer banner content
ALTER TABLE public.banners 
  ADD COLUMN IF NOT EXISTS subtitle text,
  ADD COLUMN IF NOT EXISTS cta_text text,
  ADD COLUMN IF NOT EXISTS cta_link text,
  ADD COLUMN IF NOT EXISTS template text NOT NULL DEFAULT 'test_announcement',
  ADD COLUMN IF NOT EXISTS background_color text;