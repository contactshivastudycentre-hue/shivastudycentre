import { useAuth } from '@/lib/auth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { DashboardSkeleton } from '@/components/skeletons/DashboardSkeleton';
import { BannerCarousel } from '@/components/dashboard/BannerCarousel';
import { TrendingContent } from '@/components/dashboard/TrendingContent';
import { WinnersSlider } from '@/components/dashboard/WinnersSlider';
import { ResumeLearning } from '@/components/dashboard/ResumeLearning';
import { StatsGrid } from '@/components/dashboard/StatsGrid';
import { LeadPeAd } from '@/components/LeadPeAd';
import { Link } from 'react-router-dom';
import { ClipboardList, FileText, Play, Trophy, ArrowRight } from 'lucide-react';

const fadeInUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35 },
};

const quickLinks = [
  { name: 'Tests', path: '/dashboard/tests', icon: ClipboardList, color: 'text-violet-600 bg-violet-100' },
  { name: 'Notes', path: '/dashboard/notes', icon: FileText, color: 'text-emerald-600 bg-emerald-100' },
  { name: 'Videos', path: '/dashboard/videos', icon: Play, color: 'text-rose-600 bg-rose-100' },
  { name: 'Leaderboard', path: '/dashboard/leaderboard', icon: Trophy, color: 'text-amber-600 bg-amber-100' },
];

function calcStreak(dates: string[]): number {
  if (!dates.length) return 0;
  const days = new Set(dates.map(d => new Date(d).toISOString().slice(0, 10)));
  let streak = 0;
  const cursor = new Date();
  // Allow today or yesterday as the starting point
  if (!days.has(cursor.toISOString().slice(0, 10))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!days.has(cursor.toISOString().slice(0, 10))) return 0;
  }
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export default function StudentDashboard() {
  const { user, isLoading } = useAuth();
  const queryClient = useQueryClient();

  // Mark today as an active study day the moment the dashboard opens.
  // This guarantees the streak ticks up daily even if the student doesn't
  // open a specific test/note/video.
  useEffect(() => {
    if (!user?.id) return;
    supabase.rpc('track_activity', {
      p_content_type: 'dashboard',
      p_content_id: user.id,
      p_title: 'Daily visit',
      p_subtitle: null,
    }).then(({ error }) => {
      if (!error) {
        queryClient.invalidateQueries({ queryKey: ['student-stats', user.id] });
      }
    });
  }, [user?.id, queryClient]);

  // Realtime: any new activity row for this user → recompute streak instantly.
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`streak-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'last_activity', filter: `user_id=eq.${user.id}` },
        () => queryClient.invalidateQueries({ queryKey: ['student-stats', user.id] })
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, queryClient]);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['student-stats', user?.id],
    queryFn: async () => {
      const [tests, attempts, activity] = await Promise.all([
        supabase.from('tests').select('id', { count: 'exact', head: true }).eq('is_published', true),
        supabase.from('test_attempts').select('id, score, submitted_at').eq('user_id', user?.id || ''),
        supabase
          .from('last_activity' as any)
          .select('last_opened')
          .eq('user_id', user?.id || '')
          .order('last_opened', { ascending: false })
          .limit(60),
      ]);

      const completed = attempts.data?.filter(a => a.submitted_at) || [];
      const totalScore = completed.reduce((sum, a) => sum + (a.score || 0), 0);
      const avgScore = completed.length > 0 ? Math.round(totalScore / completed.length) : 0;
      const streak = calcStreak(((activity.data as any) || []).map((a: any) => a.last_opened));

      return {
        availableTests: tests.count || 0,
        completedTests: completed.length,
        avgScore,
        streak,
      };
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  if (isLoading || (statsLoading && !stats)) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="page-shell">
      <div className="space-y-4 w-full max-w-[420px] md:max-w-3xl mx-auto">
        {/* Unified hero banner slider — includes admin banners, topper banners,
            and live/upcoming test banners (SSC Special, Weekly, Surprise Quiz) */}
        <motion.div {...fadeInUp}>
          <BannerCarousel />
        </motion.div>

        {/* Resume Learning */}
        <motion.div {...fadeInUp} transition={{ duration: 0.35, delay: 0.05 }}>
          <ResumeLearning />
        </motion.div>

        {/* Stats Grid */}
        {stats && (
          <motion.div {...fadeInUp} transition={{ duration: 0.35, delay: 0.1 }}>
            <StatsGrid
              availableTests={stats.availableTests}
              completedTests={stats.completedTests}
              avgScore={stats.avgScore}
              streakDays={stats.streak}
            />
          </motion.div>
        )}

        {/* Quick Access */}
        <motion.div {...fadeInUp} transition={{ duration: 0.35, delay: 0.15 }}>
          <h2 className="text-sm font-display font-bold text-foreground mb-2 px-1">
            Quick Access
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {quickLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="bg-card rounded-xl border border-border p-2.5 shadow-sm hover:shadow-md hover:border-primary/40 transition-all flex flex-col items-center text-center active:scale-95"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-1.5 ${link.color}`}>
                  <link.icon className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-display font-semibold text-foreground leading-tight">{link.name}</span>
              </Link>
            ))}
          </div>
        </motion.div>

        {/* Recent Winners slider (cross-class, last 7 days) */}
        <motion.div {...fadeInUp} transition={{ duration: 0.35, delay: 0.18 }}>
          <WinnersSlider />
        </motion.div>

        {/* Trending Content */}
        <motion.div {...fadeInUp} transition={{ duration: 0.35, delay: 0.22 }}>
          <TrendingContent />
        </motion.div>

        {/* LeadPe Promotional Ad */}
        <motion.div {...fadeInUp} transition={{ duration: 0.35, delay: 0.26 }}>
          <LeadPeAd variant="card" />
        </motion.div>
      </div>
    </div>
  );
}
