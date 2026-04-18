CREATE OR REPLACE FUNCTION public.sync_test_banner()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.test_type IN ('sunday_special', 'weekly', 'surprise_quiz')
     AND NEW.banner_image IS NOT NULL
     AND length(trim(NEW.banner_image)) > 0
     AND NEW.is_published = true THEN

    DELETE FROM public.banners WHERE title = '__test_' || NEW.id::text;

    INSERT INTO public.banners (
      title, subtitle, description, image_url,
      cta_text, cta_link, template, priority,
      is_active, is_universal, target_class,
      start_date, end_date, background_color
    ) VALUES (
      '__test_' || NEW.id::text,
      NEW.title,
      NEW.description,
      NEW.banner_image,
      'View Test',
      '/dashboard/tests',
      NEW.test_type::text,
      100,
      true,
      false,
      NEW.class,
      NEW.start_time,
      NEW.end_time,
      NULL
    );
  ELSE
    DELETE FROM public.banners WHERE title = '__test_' || NEW.id::text;
  END IF;
  RETURN NEW;
END;
$function$;