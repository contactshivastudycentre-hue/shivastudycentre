import { useAuth } from '@/lib/auth';
import { ClipboardList, FileText, Play, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

const quickLinks = [
  { name: 'Tests', path: '/dashboard/tests', icon: ClipboardList, color: 'bg-blue-500' },
  { name: 'Notes', path: '/dashboard/notes', icon: FileText, color: 'bg-green-500' },
  { name: 'Videos', path: '/dashboard/videos', icon: Play, color: 'bg-purple-500' },
];

export default function StudentDashboard() {
  const { profile } = useAuth();

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Section */}
      <div className="dashboard-card hero-gradient">
        <div className="hero-text">
          <h1 className="text-2xl md:text-3xl font-display font-bold mb-2">
            Welcome back, {profile?.full_name?.split(' ')[0]}! 👋
          </h1>
          <p className="text-white/80">
            Continue your learning journey with tests, notes, and videos.
          </p>
        </div>
      </div>

      {/* Quick Access */}
      <div>
        <h2 className="text-xl font-display font-semibold text-foreground mb-4">
          Quick Access
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {quickLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className="dashboard-card group hover:shadow-md transition-shadow"
            >
              <div className={`w-12 h-12 rounded-xl ${link.color} flex items-center justify-center mb-4`}>
                <link.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                {link.name}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Access your {link.name.toLowerCase()}
              </p>
            </Link>
          ))}
        </div>
      </div>

      {/* Stats Section */}
      <div>
        <h2 className="text-xl font-display font-semibold text-foreground mb-4">
          Your Progress
        </h2>
        <div className="dashboard-card">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-accent flex items-center justify-center">
              <TrendingUp className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Keep Learning!</h3>
              <p className="text-sm text-muted-foreground">
                Explore tests, notes, and videos to track your progress
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
