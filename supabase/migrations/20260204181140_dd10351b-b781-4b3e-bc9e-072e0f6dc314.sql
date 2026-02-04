-- Video likes table
CREATE TABLE public.video_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(video_id, user_id)
);

-- Enable RLS on video_likes
ALTER TABLE public.video_likes ENABLE ROW LEVEL SECURITY;

-- RLS policies for video_likes
CREATE POLICY "Users can view all likes"
  ON public.video_likes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can like videos"
  ON public.video_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_student_approved());

CREATE POLICY "Users can remove their own likes"
  ON public.video_likes FOR DELETE
  USING (auth.uid() = user_id);

-- Video comments table
CREATE TABLE public.video_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_approved BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on video_comments
ALTER TABLE public.video_comments ENABLE ROW LEVEL SECURITY;

-- RLS policies for video_comments
CREATE POLICY "Anyone can view approved comments"
  ON public.video_comments FOR SELECT
  USING (is_approved = true OR auth.uid() = user_id OR is_admin());

CREATE POLICY "Approved students can add comments"
  ON public.video_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_student_approved());

CREATE POLICY "Users can update their own comments"
  ON public.video_comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all comments"
  ON public.video_comments FOR ALL
  USING (is_admin());

-- Password reset requests table
CREATE TABLE public.password_reset_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  mobile TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rejected')),
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID
);

-- Enable RLS on password_reset_requests
ALTER TABLE public.password_reset_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for password_reset_requests
CREATE POLICY "Anyone can create reset requests"
  ON public.password_reset_requests FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view all reset requests"
  ON public.password_reset_requests FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can update reset requests"
  ON public.password_reset_requests FOR UPDATE
  USING (is_admin());

-- Add description column to videos if not exists
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS description TEXT;

-- Add comments_enabled column to videos
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS comments_enabled BOOLEAN NOT NULL DEFAULT true;

-- Create function to get like count for a video
CREATE OR REPLACE FUNCTION public.get_video_like_count(video_uuid UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER FROM public.video_likes WHERE video_id = video_uuid;
$$;

-- Create function to check if user liked a video
CREATE OR REPLACE FUNCTION public.user_has_liked_video(video_uuid UUID, check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.video_likes 
    WHERE video_id = video_uuid AND user_id = check_user_id
  );
$$;