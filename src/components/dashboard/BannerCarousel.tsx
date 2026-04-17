import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Trophy, BookOpen, Award, Sparkles, FileText, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

type BannerRow = {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  cta_text: string | null;
  cta_link: string | null;
  image_url: string | null;
  background_color: string | null;
  template: string;
  event_id: string | null;
  test_events: any;
};

const TEMPLATE_THEMES: Record<string, { bg: string; icon: any; accent: string }> = {
  test_announcement: {
    bg: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
    icon: Trophy,
    accent: '#FBBF24',
  },
  result_announcement: {
    bg: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
    icon: Award,
    accent: '#FEF3C7',
  },
  topper_banner: {
    bg: 'linear-gradient(135deg, #D97706 0%, #F59E0B 100%)',
    icon: Sparkles,
    accent: '#FFFFFF',
  },
  notes_update: {
    bg: 'linear-gradient(135deg, #0EA5E9 0%, #06B6D4 100%)',
    icon: BookOpen,
    accent: '#E0F2FE',
  },
  scholarship_banner: {
    bg: 'linear-gradient(135deg, #DB2777 0%, #E11D48 100%)',
    icon: FileText,
    accent: '#FECACA',
  },
};

function getEventCTA(banner: BannerRow): { text: string; link: string | null } | null {
  // Custom CTA wins
  if (banner.cta_text && banner.cta_link) {
    return { text: banner.cta_text, link: banner.cta_link };
  }
  // Event-derived CTA
  const event = banner.test_events;
  if (!event) return banner.cta_text ? { text: banner.cta_text, link: null } : null;

  const now = new Date();
  if (now < new Date(event.start_date)) {
    return { text: 'Starts Soon', link: null };
  }
  if (now <= new Date(event.end_date) && event.test_id) {
    return { text: 'Attempt Now', link: `/dashboard/tests/${event.test_id}` };
  }
  if (event.results_approved) {
    return { text: 'View Results', link: `/dashboard/leaderboard/${event.id}` };
  }
  return { text: 'Result Soon', link: null };
}

export function BannerCarousel() {
  const { profile } = useAuth();
  const [current, setCurrent] = useState(0);

  const { data: banners } = useQuery({
    queryKey: ['student-banners', profile?.class],
    queryFn: async () => {
      const { data } = await supabase
        .from('banners')
        .select('*, test_events(*, event_prizes(*))')
        .eq('is_active', true)
        .order('priority', { ascending: false })
        .limit(3);
      return (data || []) as unknown as BannerRow[];
    },
    enabled: !!profile,
    refetchInterval: 60000,
    refetchOnWindowFocus: true,
  });

  // Auto-slide every 3 seconds
  useEffect(() => {
    if (!banners?.length || banners.length <= 1) return;
    const id = setInterval(() => setCurrent(c => (c + 1) % banners.length), 3000);
    return () => clearInterval(id);
  }, [banners?.length]);

  // Swipe support
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => setTouchStart(e.touches[0].clientX);
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null || !banners?.length) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) setCurrent(c => (c + 1) % banners.length);
      else setCurrent(c => (c - 1 + banners.length) % banners.length);
    }
    setTouchStart(null);
  };

  if (!banners?.length) return null;

  const prev = () => setCurrent(c => (c - 1 + banners.length) % banners.length);
  const next = () => setCurrent(c => (c + 1) % banners.length);

  return (
    <div
      className="relative overflow-hidden rounded-2xl shadow-lg"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <AnimatePresence mode="wait">
        {banners.map((banner, i) => {
          if (i !== current) return null;
          const theme = TEMPLATE_THEMES[banner.template] || TEMPLATE_THEMES.test_announcement;
          const Icon = theme.icon;
          const cta = getEventCTA(banner);
          const bg = banner.background_color || theme.bg;

          return (
            <motion.div
              key={banner.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="relative w-full h-[200px] sm:h-[220px] md:h-[240px]"
              style={{ background: bg }}
            >
              {/* Subtle pattern overlay */}
              <div
                className="absolute inset-0 opacity-[0.08]"
                style={{
                  backgroundImage:
                    'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
                  backgroundSize: '24px 24px',
                }}
              />

              {/* Image right side (if provided) */}
              {banner.image_url && (
                <div className="absolute right-0 top-0 bottom-0 w-1/2 hidden sm:block">
                  <img
                    src={banner.image_url}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover object-center"
                    style={{
                      maskImage: 'linear-gradient(to left, black 40%, transparent 100%)',
                      WebkitMaskImage: 'linear-gradient(to left, black 40%, transparent 100%)',
                    }}
                  />
                </div>
              )}

              {/* Content */}
              <div className="relative z-10 h-full flex flex-col justify-center px-5 sm:px-8 md:px-10 max-w-full sm:max-w-[60%]">
                {/* Badge */}
                <div className="inline-flex items-center gap-1.5 self-start bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 mb-2 sm:mb-3">
                  <Icon className="w-3.5 h-3.5" style={{ color: theme.accent }} />
                  <span className="text-[11px] sm:text-xs font-semibold text-white uppercase tracking-wider">
                    {banner.template.replace(/_/g, ' ')}
                  </span>
                </div>

                {/* Headline */}
                <h2 className="text-white font-display font-bold text-xl sm:text-2xl md:text-3xl leading-tight mb-1 sm:mb-2 line-clamp-2">
                  {banner.title}
                </h2>

                {/* Subtitle */}
                {(banner.subtitle || banner.description) && (
                  <p className="text-white/85 text-sm sm:text-base font-medium mb-3 sm:mb-4 line-clamp-2">
                    {banner.subtitle || banner.description}
                  </p>
                )}

                {/* CTA */}
                {cta && (
                  cta.link ? (
                    <Link to={cta.link} className="self-start">
                      <Button
                        size="sm"
                        className="bg-white text-slate-900 hover:bg-white/90 font-bold rounded-full px-5 h-9 sm:h-10 shadow-md"
                      >
                        {cta.text}
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </Link>
                  ) : (
                    <span className="self-start inline-flex items-center bg-white/15 backdrop-blur-sm text-white font-semibold rounded-full px-4 h-9 sm:h-10 text-sm">
                      {cta.text}
                    </span>
                  )
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {banners.length > 1 && (
        <>
          {/* Arrows — desktop only for cleaner mobile */}
          <button
            onClick={prev}
            aria-label="Previous banner"
            className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/30 hover:bg-black/50 text-white items-center justify-center backdrop-blur-sm transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={next}
            aria-label="Next banner"
            className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/30 hover:bg-black/50 text-white items-center justify-center backdrop-blur-sm transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Dots */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                aria-label={`Go to banner ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === current ? 'bg-white w-6' : 'bg-white/50 w-1.5'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
