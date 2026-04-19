import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Link } from 'react-router-dom';
import { Sparkles, Calendar, Radio, Lock, Trophy, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

type BannerRow = {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  image_url: string | null;
  cta_link: string | null;
  cta_text: string | null;
  template?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  priority?: number | null;
};

type TestMeta = {
  test_id?: string;
  test_type?: string;
  class?: string;
  subject?: string;
  duration_minutes?: number;
  prize_pool?: number | null;
  prize_type?: string | null;
  prize_value?: string | null;
  prize_description?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  description?: string | null;
};

function prizeText(meta: TestMeta | null): string | null {
  if (!meta) return null;
  if (meta.prize_value) return meta.prize_value;
  if (meta.prize_pool) return `₹${meta.prize_pool}`;
  return null;
}

function fmtCountdown(target: Date, now: Date) {
  const ms = target.getTime() - now.getTime();
  if (ms <= 0) return '0s';
  const t = Math.floor(ms / 1000);
  const d = Math.floor(t / 86400),
    h = Math.floor((t % 86400) / 3600),
    m = Math.floor((t % 3600) / 60),
    s = t % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function parseTestMeta(b: BannerRow): TestMeta | null {
  if (b.template !== 'test_announcement' || !b.description) return null;
  try {
    return JSON.parse(b.description) as TestMeta;
  } catch {
    return null;
  }
}

function bannerSortKey(b: BannerRow, now: Date): number {
  // Lower = higher priority. Live test → upcoming test → others.
  if (b.template === 'test_announcement') {
    const meta = parseTestMeta(b);
    const start = meta?.start_time ? new Date(meta.start_time) : null;
    const end = meta?.end_time ? new Date(meta.end_time) : null;
    const isLive = (!start || start <= now) && (!end || end > now);
    if (isLive) return 0;
    if (start && start > now) return 1;
    return 3;
  }
  // Topper / winner banners (template hint)
  if (b.template === 'topper' || b.template === 'winners') return 2;
  return 4;
}

export function BannerCarousel() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const [current, setCurrent] = useState(0);
  const [now, setNow] = useState(new Date());

  // tick once a second so countdowns + sort stay live
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const { data: rawBanners } = useQuery({
    queryKey: ['student-banners', profile?.class],
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const { data } = await supabase
        .from('banners')
        .select('id, title, subtitle, description, image_url, cta_link, cta_text, template, start_date, end_date, priority')
        .eq('is_active', true)
        .or(`start_date.is.null,start_date.lte.${nowIso}`)
        .or(`end_date.is.null,end_date.gte.${nowIso}`)
        .order('priority', { ascending: false })
        .limit(8);
      return ((data || []) as BannerRow[]).filter(b => !!b.image_url);
    },
    enabled: !!profile,
    refetchInterval: 60000,
    refetchOnWindowFocus: true,
  });

  // Sort by priority bucket (live > upcoming > topper > admin), then DB priority
  const banners = useMemo(() => {
    if (!rawBanners) return [] as BannerRow[];
    return [...rawBanners].sort((a, b) => {
      const ka = bannerSortKey(a, now);
      const kb = bannerSortKey(b, now);
      if (ka !== kb) return ka - kb;
      return (b.priority ?? 0) - (a.priority ?? 0);
    });
  }, [rawBanners, now]);

  // Realtime: refresh banners + tests as soon as admin edits one
  useEffect(() => {
    const channel = supabase
      .channel('banners-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'banners' }, () =>
        qc.invalidateQueries({ queryKey: ['student-banners'] }),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tests' }, () =>
        qc.invalidateQueries({ queryKey: ['student-banners'] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  // Auto-slide
  useEffect(() => {
    if (!banners.length || banners.length <= 1) return;
    const id = setInterval(() => setCurrent(c => (c + 1) % banners.length), 5000);
    return () => clearInterval(id);
  }, [banners.length]);

  // Reset index when banners change
  useEffect(() => {
    if (current >= banners.length) setCurrent(0);
  }, [banners, current]);

  // Swipe support
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => setTouchStart(e.touches[0].clientX);
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null || !banners.length) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) setCurrent(c => (c + 1) % banners.length);
      else setCurrent(c => (c - 1 + banners.length) % banners.length);
    }
    setTouchStart(null);
  };

  if (!banners.length) return null;

  const banner = banners[current];
  const meta = parseTestMeta(banner);
  const isTest = !!meta;
  const start = meta?.start_time ? new Date(meta.start_time) : null;
  const end = meta?.end_time ? new Date(meta.end_time) : null;
  const phase: 'upcoming' | 'live' | 'closed' =
    isTest && start && now < start
      ? 'upcoming'
      : isTest && end && now > end
      ? 'closed'
      : 'live';

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl bg-muted shadow-sm"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{ aspectRatio: '16 / 7' }}
    >
      {/* Background image */}
      <img
        src={banner.image_url!}
        alt={banner.title || ''}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 w-full h-full object-cover object-center"
      />

      {isTest ? (
        <>
          {/* Dark gradient for legibility */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-black/10" />

          {/* Content */}
          <div className="relative z-10 h-full flex flex-col justify-between p-3 sm:p-4 text-white">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest bg-gradient-to-r from-amber-500 to-orange-500 rounded-full px-2 py-0.5 shadow">
                <Sparkles className="w-3 h-3" />
                {meta!.test_type === 'sunday_special'
                  ? 'SSC Special Test'
                  : meta!.test_type === 'weekly'
                  ? 'Weekly Test'
                  : 'Surprise Quiz'}
              </span>
              {phase === 'live' && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-500/90 rounded-full px-2 py-0.5 animate-pulse">
                  <Radio className="w-3 h-3" /> LIVE
                </span>
              )}
            </div>

            <div className="flex-1 flex flex-col justify-center min-h-0">
              <h2 className="font-display text-base sm:text-xl font-bold leading-tight line-clamp-1">
                {banner.subtitle || banner.title}
              </h2>
              <p className="text-[11px] sm:text-sm text-white/85 mt-0.5 line-clamp-1">
                {meta!.class} • {meta!.subject} • {meta!.duration_minutes} min
              </p>
              <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                {prizeText(meta) ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-gradient-to-r from-amber-400 to-yellow-500 text-amber-950 rounded-full px-2 py-0.5 shadow-sm">
                    <Trophy className="w-3 h-3" /> Prize: {prizeText(meta)}
                  </span>
                ) : null}
                {phase === 'upcoming' && start && (
                  <>
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-white/20 backdrop-blur rounded-full px-2 py-0.5">
                      <Calendar className="w-3 h-3" /> Starts in {fmtCountdown(start, now)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-white/30 backdrop-blur rounded-full px-2 py-0.5 uppercase tracking-wide">
                      ⏰ {start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                    </span>
                  </>
                )}
                {phase === 'live' && end && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-white/20 backdrop-blur rounded-full px-2 py-0.5">
                    <Radio className="w-3 h-3" /> Ends in {fmtCountdown(end, now)}
                  </span>
                )}
                {phase === 'closed' && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-white/20 backdrop-blur rounded-full px-2 py-0.5">
                    <Lock className="w-3 h-3" /> Closed
                  </span>
                )}
              </div>
            </div>

            <div className="flex justify-start">
              {phase === 'live' && banner.cta_link ? (
                <Link to={banner.cta_link}>
                  <Button size="sm" className="h-7 px-3 text-xs bg-white text-orange-600 hover:bg-white/90 font-bold gap-1">
                    Attempt Now <ArrowRight className="w-3 h-3" />
                  </Button>
                </Link>
              ) : phase === 'upcoming' ? (
                <Button size="sm" disabled className="h-7 px-3 text-xs bg-white/25 text-white border border-white/40">
                  Upcoming
                </Button>
              ) : phase === 'closed' && meta?.test_id ? (
                <Link to={`/dashboard/tests`}>
                  <Button size="sm" variant="outline" className="h-7 px-3 text-xs bg-white/10 text-white border-white/40 hover:bg-white/20">
                    View Result
                  </Button>
                </Link>
              ) : null}
            </div>
          </div>
        </>
      ) : (
        // Plain admin/topper banner — keep image only, with optional click-through
        banner.cta_link && (
          <Link to={banner.cta_link} className="absolute inset-0 z-10" aria-label={banner.title} />
        )
      )}

      {banners.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              aria-label={`Go to banner ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === current ? 'bg-white w-5' : 'bg-white/60 w-1.5'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
