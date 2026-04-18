import { useAuth } from '@/lib/auth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { DashboardSkeleton } from '@/components/skeletons/DashboardSkeleton';
import { BannerCarousel } from '@/components/dashboard/BannerCarousel';
import { HighlightedTestBanner } from '@/components/dashboard/HighlightedTestBanner';
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
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Sunday Special highlight (realtime, only renders when a Sunday Special test exists) */}
      <HighlightedTestBanner />

      {/* Hero Banner */}
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
        <h2 className="text-base font-display font-bold text-foreground mb-3 px-1">
          Quick Access
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className="bg-card rounded-2xl border border-border p-4 shadow-sm hover:shadow-md hover:border-primary/40 transition-all flex flex-col items-center text-center active:scale-95"
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-2 ${link.color}`}>
                <link.icon className="w-6 h-6" />
              </div>
              <span className="text-sm font-display font-semibold text-foreground">{link.name}</span>
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
  );
}
