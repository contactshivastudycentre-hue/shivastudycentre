import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Users, ClipboardList, FileText, Play, Clock, CheckCircle, ArrowRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

interface Stats {
  totalStudents: number;
  pendingStudents: number;
  approvedStudents: number;
  totalTests: number;
  totalNotes: number;
  totalVideos: number;
}

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

const stagger = {
  animate: {
    transition: {
      staggerChildren: 0.08
    }
  }
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalStudents: 0,
    pendingStudents: 0,
    approvedStudents: 0,
    totalTests: 0,
    totalNotes: 0,
    totalVideos: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();

    // Realtime subscription for profiles
    const profilesChannel = supabase
      .channel('admin-profiles')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => fetchStats()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profilesChannel);
    };
  }, []);

  const fetchStats = async () => {
    const [profilesCount, pendingCount, approvedCount, tests, notes, videos] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
      supabase.from('tests').select('id', { count: 'exact', head: true }),
      supabase.from('notes').select('id', { count: 'exact', head: true }),
      supabase.from('videos').select('id', { count: 'exact', head: true }),
    ]);

    setStats({
      totalStudents: profilesCount.count || 0,
      pendingStudents: pendingCount.count || 0,
      approvedStudents: approvedCount.count || 0,
      totalTests: tests.count || 0,
      totalNotes: notes.count || 0,
      totalVideos: videos.count || 0,
    });

    setIsLoading(false);
  };

  const statCards = [
    {
      title: 'Total Students',
      value: stats.totalStudents,
      icon: Users,
      gradient: 'from-blue-500 to-indigo-600',
      link: '/admin/students',
    },
    {
      title: 'Pending Approvals',
      value: stats.pendingStudents,
      icon: Clock,
      gradient: 'from-orange-500 to-amber-600',
      link: '/admin/students?status=pending',
      highlight: stats.pendingStudents > 0,
    },
    {
      title: 'Approved Students',
      value: stats.approvedStudents,
      icon: CheckCircle,
      gradient: 'from-emerald-500 to-green-600',
      link: '/admin/students?status=approved',
    },
    {
      title: 'Total Tests',
      value: stats.totalTests,
      icon: ClipboardList,
      gradient: 'from-violet-500 to-purple-600',
      link: '/admin/tests',
    },
    {
      title: 'Total Notes',
      value: stats.totalNotes,
      icon: FileText,
      gradient: 'from-teal-500 to-cyan-600',
      link: '/admin/notes',
    },
    {
      title: 'Total Videos',
      value: stats.totalVideos,
      icon: Play,
      gradient: 'from-pink-500 to-rose-600',
      link: '/admin/videos',
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <motion.div 
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-muted-foreground"
        >
          Loading dashboard...
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl hero-gradient p-8 md:p-10"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24 blur-3xl" />
        
        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-1.5 mb-4"
          >
            <Sparkles className="w-4 h-4 text-yellow-300" />
            <span className="text-sm font-medium text-white">Admin Panel</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-2xl md:text-4xl font-display font-bold text-white mb-3"
          >
            Admin Dashboard
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-white/80 text-lg"
          >
            Manage students, tests, notes, and videos from here.
          </motion.p>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div 
        variants={stagger}
        initial="initial"
        animate="animate"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
      >
        {statCards.map((stat, index) => (
          <motion.div key={stat.title} variants={fadeInUp}>
            <Link
              to={stat.link}
              className={`block dashboard-card group hover:shadow-xl transition-all duration-300 ${
                stat.highlight ? 'ring-2 ring-pending/30' : ''
              }`}
            >
              <div className="flex items-center gap-5">
                <motion.div 
                  className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}
                  whileHover={{ rotate: [0, -5, 5, 0] }}
                  transition={{ duration: 0.5 }}
                >
                  <stat.icon className="w-8 h-8 text-white" />
                </motion.div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-3xl font-display font-bold text-foreground group-hover:text-primary transition-colors">
                    {stat.value}
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>
          </motion.div>
        ))}
      </motion.div>

      {/* Pending Approvals Alert */}
      {stats.pendingStudents > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="dashboard-card border-l-4 border-l-pending bg-pending/5"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <motion.div 
                className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Clock className="w-7 h-7 text-white" />
              </motion.div>
              <div>
                <h3 className="font-display font-bold text-foreground text-lg">Pending Approvals</h3>
                <p className="text-muted-foreground">
                  {stats.pendingStudents} student{stats.pendingStudents !== 1 ? 's' : ''} waiting for approval
                </p>
              </div>
            </div>
            <Link
              to="/admin/students?status=pending"
              className="inline-flex items-center gap-2 text-primary font-semibold hover:underline"
            >
              Review Now <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>
      )}
    </div>
  );
}
