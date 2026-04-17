import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Clock, Trophy, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

function getEventStatus(start: string, end: string) {
  const now = new Date();
  if (now < new Date(start)) return 'upcoming';
  if (now <= new Date(end)) return 'active';
  return 'ended';
}

function Countdown({ target }: { target: string }) {
  const [diff, setDiff] = useState('');
  useEffect(() => {
    const tick = () => {
      const ms = new Date(target).getTime() - Date.now();
      if (ms <= 0) { setDiff('Starting now!'); return; }
      const d = Math.floor(ms / 86400000);
      const h = Math.floor((ms % 86400000) / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      setDiff(`${d > 0 ? d + 'd ' : ''}${h}h ${m}m`);
    };
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [target]);
  return <span className="text-sm font-medium text-white/90">{diff}</span>;
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
        .limit(4);
      return data || [];
    },
    enabled: !!profile,
    refetchInterval: 60000,
    refetchOnWindowFocus: true,
  });

  // Auto-slide every 5 seconds
  useEffect(() => {
    if (!banners?.length || banners.length <= 1) return;
    const id = setInterval(() => setCurrent(c => (c + 1) % banners.length), 5000);
    return () => clearInterval(id);
  }, [banners?.length]);

  if (!banners?.length) return null;

  const prev = () => setCurrent(c => (c - 1 + banners.length) % banners.length);
  const next = () => setCurrent(c => (c + 1) % banners.length);

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <AnimatePresence mode="wait">
        {banners.map((banner: any, i: number) => {
          if (i !== current) return null;
          const event = banner.test_events;
          const prize = event?.event_prizes?.[0];
          const status = event ? getEventStatus(event.start_date, event.end_date) : null;

          return (
            <motion.div
              key={banner.id}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="relative min-h-[180px] sm:min-h-[200px] rounded-2xl overflow-hidden"
              style={{
                background: banner.image_url
                  ? `linear-gradient(135deg, rgba(99,102,241,0.9), rgba(168,85,247,0.85)), url(${banner.image_url}) center/cover`
                  : 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent-gradient)))',
              }}
            >
              <div className="relative z-10 p-5 sm:p-7 flex flex-col justify-between h-full min-h-[180px]">
                <div>
                  <h3 className="text-lg sm:text-xl font-display font-bold text-white mb-1">{banner.title}</h3>
                  {banner.description && <p className="text-white/80 text-sm mb-2">{banner.description}</p>}
                  <div className="flex flex-wrap gap-2 items-center">
                    {event && (
                      <>
                        <span className="text-xs bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-white">
                          {event.is_universal ? 'All Classes' : `Class ${event.target_class}`}
                        </span>
                        <span className="text-xs bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-white">
                          {new Date(event.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </span>
                      </>
                    )}
                    {prize?.first_prize && (
                      <span className="text-xs bg-yellow-400/30 backdrop-blur-sm rounded-full px-3 py-1 text-white flex items-center gap-1">
                        <Trophy className="w-3 h-3" />🥇 {prize.first_prize}
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-3">
                  {status === 'upcoming' && (
                    <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2">
                      <Clock className="w-4 h-4 text-white" />
                      <Countdown target={event.start_date} />
                    </div>
                  )}
                  {status === 'active' && event?.test_id && (
                    <Link to={`/dashboard/tests/${event.test_id}`}>
                      <Button size="sm" className="bg-white text-primary hover:bg-white/90 font-bold shadow-lg">
                        Attempt Now <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </Link>
                  )}
                  {status === 'ended' && event?.results_approved && (
                    <Link to={`/dashboard/leaderboard/${event.id}`}>
                      <Button size="sm" variant="secondary" className="font-bold">
                        <Trophy className="w-4 h-4 mr-1" />View Results
                      </Button>
                    </Link>
                  )}
                  {status === 'ended' && !event?.results_approved && (
                    <span className="text-sm text-white/70 bg-white/10 rounded-xl px-4 py-2">Results Coming Soon</span>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {banners.length > 1 && (
        <>
          <button onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/30 text-white flex items-center justify-center backdrop-blur-sm">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/30 text-white flex items-center justify-center backdrop-blur-sm">
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
            {banners.map((_: any, i: number) => (
              <button key={i} onClick={() => setCurrent(i)} className={`w-2 h-2 rounded-full transition-all ${i === current ? 'bg-white w-5' : 'bg-white/50'}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
