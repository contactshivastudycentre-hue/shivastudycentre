import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Link } from 'react-router-dom';
import { Trophy, Clock, ArrowRight, Eye } from 'lucide-react';
import { motion } from 'framer-motion';

interface SundayEvent {
  id: string;
  event_name: string;
  start_date: string;
  end_date: string;
  test_id: string | null;
  target_class: string | null;
  is_universal: boolean;
  results_approved: boolean;
}

function getCountdown(target: Date) {
  const ms = target.getTime() - Date.now();
  if (ms <= 0) return null;
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

export function SundaySpecialCard() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const [tick, setTick] = useState(0);

  const { data: event } = useQuery({
    queryKey: ['sunday-special-card', profile?.class],
    queryFn: async (): Promise<SundayEvent | null> => {
      if (!profile?.class) return null;
      const nowIso = new Date().toISOString();
      const { data } = await supabase
        .from('test_events')
        .select('id, event_name, start_date, end_date, test_id, target_class, is_universal, results_approved')
        .eq('event_type', 'sunday_special')
        .eq('status', 'active')
        .gte('end_date', new Date(Date.now() - 7 * 86_400_000).toISOString())
        .or(`is_universal.eq.true,target_class.eq.${profile.class}`)
        .order('start_date', { ascending: true })
        .limit(1)
        .maybeSingle();
      return (data as SundayEvent) || null;
    },
    enabled: !!profile?.class,
    refetchInterval: 30_000,
  });

  // Realtime subscription on test_events
  useEffect(() => {
    const channel = supabase
      .channel('sunday-special-events')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'test_events' },
        () => qc.invalidateQueries({ queryKey: ['sunday-special-card'] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  // 1-second tick for countdown
  useEffect(() => {
    if (!event) return;
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [event]);

  if (!event) return null;

  const start = new Date(event.start_date);
  const end = new Date(event.end_date);
  const now = new Date();

  // Defensive: if dates are inverted/equal, the event window is invalid - still show as upcoming until start
  const validWindow = end.getTime() > start.getTime();

  let phase: 'upcoming' | 'live' | 'ended' = 'upcoming';
  if (validWindow && now >= start && now <= end) phase = 'live';
  else if (validWindow && now > end) phase = 'ended';
  else if (!validWindow && now >= start) phase = 'ended';

  const countdown = phase === 'upcoming' ? getCountdown(start) : phase === 'live' ? getCountdown(end) : null;

  // After 24h post-end, hide the card unless results are published
  if (phase === 'ended' && !event.results_approved && now.getTime() - end.getTime() > 86_400_000) {
    return null;
  }

  const ctaConfig = (() => {
    if (phase === 'upcoming') {
      return {
        label: 'Upcoming',
        icon: Clock,
        href: null as string | null,
        disabled: true,
      };
    }
    if (phase === 'live' && event.test_id) {
      return {
        label: 'Start Test',
        icon: ArrowRight,
        href: `/dashboard/tests/${event.test_id}`,
        disabled: false,
      };
    }
    if (phase === 'ended' && event.results_approved) {
      return {
        label: 'View Result',
        icon: Eye,
        href: `/dashboard/leaderboard/${event.id}`,
        disabled: false,
      };
    }
    return {
      label: phase === 'ended' ? 'Awaiting Results' : 'Soon',
      icon: Clock,
      href: null,
      disabled: true,
    };
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="relative overflow-hidden rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-primary/5 via-background to-amber-50/50 p-3 shadow-[0_0_24px_-6px_hsl(var(--primary)/0.45)] animate-pulse-slow"
      style={{ animation: 'subtleGlow 2.4s ease-in-out infinite' }}
    >
      {/* Glow keyframes inline so we don't need tailwind config edits */}
      <style>{`
        @keyframes subtleGlow {
          0%, 100% { box-shadow: 0 0 24px -6px hsl(var(--primary) / 0.35); }
          50% { box-shadow: 0 0 32px -4px hsl(var(--primary) / 0.6); }
        }
      `}</style>

      <div className="flex items-center gap-3">
        {/* Trophy icon */}
        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md">
          <Trophy className="w-6 h-6 text-white" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-gradient-to-r from-amber-500 to-orange-500 text-white">
              Sunday Special
            </span>
            {phase === 'live' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                LIVE
              </span>
            )}
          </div>
          <p className="font-display font-bold text-sm text-foreground truncate leading-tight">
            {event.event_name}
          </p>
          {countdown && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {phase === 'upcoming' ? 'Starts in ' : 'Ends in '}
              <span className="font-mono font-semibold text-primary">{countdown}</span>
            </p>
          )}
        </div>

        {/* CTA */}
        <div className="flex-shrink-0">
          {ctaConfig.href && !ctaConfig.disabled ? (
            <Link
              to={ctaConfig.href}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold shadow-md hover:shadow-lg active:scale-95 transition-all"
            >
              <ctaConfig.icon className="w-3.5 h-3.5" />
              {ctaConfig.label}
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-muted text-muted-foreground text-xs font-semibold">
              <ctaConfig.icon className="w-3.5 h-3.5" />
              {ctaConfig.label}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
