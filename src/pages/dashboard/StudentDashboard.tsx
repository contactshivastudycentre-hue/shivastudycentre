import { useAuth } from '@/lib/auth';
import { ClipboardList, FileText, Play, TrendingUp, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardSkeleton } from '@/components/skeletons/DashboardSkeleton';
import { BannerCarousel } from '@/components/dashboard/BannerCarousel';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 }
};

const stagger = {
  animate: {
    transition: {
      staggerChildren: 0.08
    }
  }
};

const quickLinks = [
  { 
    name: 'Tests', 
    path: '/dashboard/tests', 
    icon: ClipboardList, 
    gradient: 'from-violet-500 to-purple-600',
    description: 'Take online MCQ tests'
  },
  { 
    name: 'Notes', 
    path: '/dashboard/notes', 
    icon: FileText, 
    gradient: 'from-emerald-500 to-teal-600',
    description: 'Download study materials'
  },
  { 
    name: 'Videos', 
    path: '/dashboard/videos', 
    icon: Play, 
    gradient: 'from-pink-500 to-rose-600',
    description: 'Watch video lectures'
  },
];

export default function StudentDashboard() {
  const { profile, user, isLoading } = useAuth();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['student-stats', user?.id],
    queryFn: async () => {
      const [tests, attempts] = await Promise.all([
        supabase.from('tests').select('id', { count: 'exact', head: true }).eq('is_published', true),
        supabase.from('test_attempts').select('id, score, submitted_at').eq('user_id', user?.id || ''),
      ]);
      
      const completedTests = attempts.data?.filter(a => a.submitted_at) || [];
      const totalScore = completedTests.reduce((sum, a) => sum + (a.score || 0), 0);
      const avgScore = completedTests.length > 0 ? Math.round(totalScore / completedTests.length) : 0;
      
      return {
        availableTests: tests.count || 0,
        completedTests: completedTests.length,
        avgScore,
      };
    },
    enabled: !!user?.id,
    staleTime: 30000, // Cache for 30 seconds
  });

  // Show skeleton while loading
  if (isLoading || (statsLoading && !stats)) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-8">
      {/* Banner Carousel */}
      <BannerCarousel />

      {/* Stats Cards */}
      {stats && (
        <motion.div 
          initial="initial"
          animate="animate"
          variants={stagger}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        >
          <motion.div variants={fadeInUp} className="stat-card">
            <div className="relative z-10">
              <p className="text-sm text-muted-foreground mb-1">Available Tests</p>
              <p className="text-3xl font-display font-bold text-foreground">{stats.availableTests}</p>
            </div>
          </motion.div>
          <motion.div variants={fadeInUp} className="stat-card">
            <div className="relative z-10">
              <p className="text-sm text-muted-foreground mb-1">Completed Tests</p>
              <p className="text-3xl font-display font-bold text-foreground">{stats.completedTests}</p>
            </div>
          </motion.div>
          <motion.div variants={fadeInUp} className="stat-card">
            <div className="relative z-10">
              <p className="text-sm text-muted-foreground mb-1">Average Score</p>
              <p className="text-3xl font-display font-bold text-foreground">{stats.avgScore}%</p>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Quick Access */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h2 className="text-xl font-display font-bold text-foreground mb-5">
          Quick Access
        </h2>
        <motion.div 
          variants={stagger}
          initial="initial"
          animate="animate"
          className="grid grid-cols-1 sm:grid-cols-3 gap-5"
        >
          {quickLinks.map((link, index) => (
            <motion.div key={link.path} variants={fadeInUp}>
              <Link
                to={link.path}
                className="block dashboard-card group hover:shadow-xl transition-all duration-300"
              >
                <motion.div 
                  className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${link.gradient} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}
                  whileHover={{ rotate: [0, -5, 5, 0] }}
                  transition={{ duration: 0.5 }}
                >
                  <link.icon className="w-7 h-7 text-white" />
                </motion.div>
                <h3 className="text-lg font-display font-bold text-foreground group-hover:text-primary transition-colors mb-1">
                  {link.name}
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {link.description}
                </p>
                <span className="inline-flex items-center text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  Access Now <ArrowRight className="w-4 h-4 ml-1" />
                </span>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      {/* Progress Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <h2 className="text-xl font-display font-bold text-foreground mb-5">
          Your Progress
        </h2>
        <div className="dashboard-card">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent-gradient flex items-center justify-center shadow-lg">
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="font-display font-bold text-foreground text-lg">Keep Learning!</h3>
              <p className="text-muted-foreground">
                Complete more tests to track your progress and improve your scores.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
