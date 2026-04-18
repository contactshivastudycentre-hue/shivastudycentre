import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Calendar, Radio, Lock, Sparkles, ArrowRight } from 'lucide-react';

interface HighlightTest {
  id: string;
  title: string;
  description: string | null;
  class: string;
  subject: string;
  duration_minutes: number;
  start_time: string | null;
  end_time: string | null;
  banner_image: string | null;
  test_type: string;
}

function fmt(target: Date, now: Date) {
  const ms = target.getTime() - now.getTime();
  if (ms <= 0) return '0s';
  const t = Math.floor(ms / 1000);
  const d = Math.floor(t / 86400), h = Math.floor((t % 86400) / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function HighlightedTestBanner() {
  const { profile } = useAuth();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const { data: test } = useQuery({
    queryKey: ['highlight-test', profile?.class],
    queryFn: async () => {
      let q = supabase
        .from('tests')
        .select('id, title, description, class, subject, duration_minutes, start_time, end_time, banner_image, test_type')
        .eq('is_published', true)
        .in('test_type', ['sunday_special', 'weekly', 'surprise_quiz'] as any)
        .order('start_time', { ascending: true })
        .limit(10);
      if (profile?.class) q = q.eq('class', profile.class);
      const { data } = await q;
      const list = (data || []) as unknown as HighlightTest[];
      // Pick the next live or upcoming test that hasn't ended
      const active = list.find(t => !t.end_time || new Date(t.end_time) > new Date());
      return active || null;
    },
    enabled: !!profile,
    refetchInterval: 30000,
  });

  if (!test) return null;

  const start = test.start_time ? new Date(test.start_time) : null;
  const end = test.end_time ? new Date(test.end_time) : null;
  const phase: 'upcoming' | 'live' | 'closed' =
    start && now < start ? 'upcoming'
    : end && now > end ? 'closed'
    : 'live';

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 p-5 text-white shadow-lg">
      <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10 blur-2xl" aria-hidden />
      <div className="relative flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest bg-white/20 backdrop-blur rounded-full px-2 py-1 mb-2">
            <Sparkles className="w-3 h-3" /> SSC Sunday Special
          </div>
          <h2 className="font-display text-xl font-bold leading-tight mb-1">{test.title}</h2>
          <p className="text-white/90 text-sm">Class {test.class} • {test.subject} • {test.duration_minutes} min</p>

          <div className="mt-3 flex items-center gap-2 text-sm font-medium">
            {phase === 'upcoming' && start && (
              <span className="inline-flex items-center gap-1 bg-white/20 rounded-full px-3 py-1">
                <Calendar className="w-4 h-4" /> Starts in {fmt(start, now)}
              </span>
            )}
            {phase === 'live' && end && (
              <span className="inline-flex items-center gap-1 bg-emerald-400/30 rounded-full px-3 py-1 animate-pulse">
                <Radio className="w-4 h-4" /> LIVE • ends in {fmt(end, now)}
              </span>
            )}
            {phase === 'closed' && (
              <span className="inline-flex items-center gap-1 bg-white/20 rounded-full px-3 py-1">
                <Lock className="w-4 h-4" /> Test closed
              </span>
            )}
          </div>

          <div className="mt-4">
            {phase === 'live' ? (
              <Link to={`/dashboard/tests/${test.id}`}>
                <Button size="sm" className="bg-white text-orange-600 hover:bg-white/90 font-bold gap-1">
                  Attempt Test <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            ) : phase === 'upcoming' ? (
              <Button size="sm" disabled className="bg-white/30 text-white border border-white/30 gap-1">
                Upcoming
              </Button>
            ) : (
              <Link to={`/dashboard/tests`}>
                <Button size="sm" variant="outline" className="bg-white/10 text-white border-white/40 hover:bg-white/20">
                  View Result
                </Button>
              </Link>
            )}
          </div>
        </div>

        {test.banner_image && (
          <img
            src={test.banner_image}
            alt=""
            className="hidden sm:block w-28 h-28 rounded-xl object-cover ring-2 ring-white/40"
          />
        )}
      </div>
    </div>
  );
}
