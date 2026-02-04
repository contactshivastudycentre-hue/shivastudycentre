import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Users, ClipboardList, FileText, Play, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Stats {
  totalStudents: number;
  pendingStudents: number;
  approvedStudents: number;
  totalTests: number;
  totalNotes: number;
  totalVideos: number;
}

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
  }, []);

  const fetchStats = async () => {
    const [profiles, tests, notes, videos] = await Promise.all([
      supabase.from('profiles').select('status'),
      supabase.from('tests').select('id', { count: 'exact', head: true }),
      supabase.from('notes').select('id', { count: 'exact', head: true }),
      supabase.from('videos').select('id', { count: 'exact', head: true }),
    ]);

    const profileData = profiles.data || [];
    
    setStats({
      totalStudents: profileData.length,
      pendingStudents: profileData.filter((p) => p.status === 'pending').length,
      approvedStudents: profileData.filter((p) => p.status === 'approved').length,
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
      color: 'bg-blue-500',
      link: '/admin/students',
    },
    {
      title: 'Pending Approvals',
      value: stats.pendingStudents,
      icon: Clock,
      color: 'bg-orange-500',
      link: '/admin/students?status=pending',
    },
    {
      title: 'Approved Students',
      value: stats.approvedStudents,
      icon: CheckCircle,
      color: 'bg-green-500',
      link: '/admin/students?status=approved',
    },
    {
      title: 'Total Tests',
      value: stats.totalTests,
      icon: ClipboardList,
      color: 'bg-purple-500',
      link: '/admin/tests',
    },
    {
      title: 'Total Notes',
      value: stats.totalNotes,
      icon: FileText,
      color: 'bg-teal-500',
      link: '/admin/notes',
    },
    {
      title: 'Total Videos',
      value: stats.totalVideos,
      icon: Play,
      color: 'bg-pink-500',
      link: '/admin/videos',
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage students, tests, notes, and videos</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((stat) => (
          <Link
            key={stat.title}
            to={stat.link}
            className="dashboard-card group hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-xl ${stat.color} flex items-center justify-center`}>
                <stat.icon className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
                <p className="text-3xl font-display font-bold text-foreground group-hover:text-primary transition-colors">
                  {stat.value}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      {stats.pendingStudents > 0 && (
        <div className="dashboard-card border-l-4 border-l-pending">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-pending/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-pending" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Pending Approvals</h3>
                <p className="text-sm text-muted-foreground">
                  {stats.pendingStudents} student{stats.pendingStudents !== 1 ? 's' : ''} waiting for approval
                </p>
              </div>
            </div>
            <Link
              to="/admin/students?status=pending"
              className="text-primary font-medium hover:underline"
            >
              Review Now →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
