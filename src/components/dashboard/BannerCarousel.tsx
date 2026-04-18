import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Link } from 'react-router-dom';

type BannerRow = {
  id: string;
  image_url: string | null;
  cta_link: string | null;
  template?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  priority?: number | null;
};

export function BannerCarousel() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const [current, setCurrent] = useState(0);

  const { data: banners } = useQuery({
    queryKey: ['student-banners', profile?.class],
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const { data } = await supabase
        .from('banners')
        .select('id, image_url, cta_link, template, start_date, end_date, priority')
        .eq('is_active', true)
        .or(`start_date.is.null,start_date.lte.${nowIso}`)
        .or(`end_date.is.null,end_date.gte.${nowIso}`)
        .order('priority', { ascending: false })
        .limit(5);
      return ((data || []) as BannerRow[]).filter(b => !!b.image_url);
    },
    enabled: !!profile,
    refetchInterval: 60000,
    refetchOnWindowFocus: true,
  });

  // Realtime: refresh banners as soon as admin creates/updates one
  useEffect(() => {
    const channel = supabase
      .channel('banners-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'banners' },
        () => qc.invalidateQueries({ queryKey: ['student-banners'] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  // Auto-slide every 5 seconds
  useEffect(() => {
    if (!banners?.length || banners.length <= 1) return;
    const id = setInterval(() => setCurrent(c => (c + 1) % banners.length), 5000);
    return () => clearInterval(id);
  }, [banners?.length]);

  // Reset index when banners change
  useEffect(() => {
    if (banners && current >= banners.length) setCurrent(0);
  }, [banners, current]);

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

  const banner = banners[current];
  const isSunday = banner.template === 'sunday_special';

  const ImageEl = (
    <img
      src={banner.image_url!}
      alt=""
      loading="lazy"
      decoding="async"
      className="w-full h-full object-cover object-center block"
    />
  );

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl bg-muted"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{ aspectRatio: '16 / 7' }}
    >
      {banner.cta_link ? (
        <Link to={banner.cta_link} className="block w-full h-full">
          {ImageEl}
        </Link>
      ) : (
        ImageEl
      )}

      {/* Sunday Special label badge */}
      {isSunday && (
        <div className="absolute top-2 left-2 z-10 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md">
          🏆 Special Sunday Test – SSC
        </div>
      )}

      {banners.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 flex gap-1.5">
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
