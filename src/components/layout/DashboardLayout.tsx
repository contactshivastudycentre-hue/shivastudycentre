import { Outlet, Link, useLocation, Navigate } from 'react-router-dom';
import { Home, FileText, Play, ClipboardList, User, LogOut, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { BottomNav } from './BottomNav';
import { Logo, LogoIcon } from '@/components/Logo';

const sidebarItems = [
  { name: 'Dashboard', path: '/dashboard', icon: Home },
  { name: 'Tests', path: '/dashboard/tests', icon: ClipboardList },
  { name: 'Notes', path: '/dashboard/notes', icon: FileText },
  { name: 'Videos', path: '/dashboard/videos', icon: Play },
  { name: 'Profile', path: '/dashboard/profile', icon: User },
];

export function DashboardLayout() {
  const location = useLocation();
  const { user, profile, isLoading, signOut } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/student-login" replace />;
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Profile Not Found</h2>
          <p className="text-muted-foreground mb-4">Please complete your registration.</p>
          <Button onClick={signOut}>Sign Out</Button>
        </div>
      </div>
    );
  }

  if (profile.status === 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-pending/10 flex items-center justify-center mx-auto mb-6">
            <BookOpen className="w-10 h-10 text-pending" />
          </div>
          <h2 className="text-2xl font-display font-bold mb-2">Waiting for Approval</h2>
          <p className="text-muted-foreground mb-6">
            Your account is pending approval from the admin. You'll receive access once approved.
          </p>
          <div className="bg-pending/10 rounded-xl p-4 mb-6">
            <p className="text-sm text-pending font-medium">
              Status: Pending Approval
            </p>
          </div>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    );
  }

  if (profile.status === 'inactive') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
            <BookOpen className="w-10 h-10 text-destructive" />
          </div>
          <h2 className="text-2xl font-display font-bold mb-2">Account Deactivated</h2>
          <p className="text-muted-foreground mb-6">
            Your account has been deactivated. Please contact the admin for assistance.
          </p>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    );
  }

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-64 bg-card border-r border-border flex-col">
        {/* Logo */}
        <div className="p-4 border-b border-border">
          <Link to="/dashboard" className="block">
            <Logo size="sm" showText={true} showPoweredBy={true} />
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {sidebarItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                    isActive(item.path)
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-border">
          <div className="mb-3 px-4">
            <p className="font-semibold text-foreground truncate">{profile.full_name}</p>
            <p className="text-sm text-muted-foreground truncate">{profile.class || 'Student'}</p>
          </div>
          <Button variant="ghost" className="w-full justify-start" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-16 bg-card border-b border-border z-40 flex items-center justify-between px-4">
        <Link to="/dashboard" className="flex items-center gap-2">
          <LogoIcon size={32} />
          <div className="flex flex-col">
            <span className="font-display text-base font-bold text-foreground leading-tight">
              Shiva Study Center
            </span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Powered by KAIRAUX
            </span>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground hidden sm:block">{profile.full_name}</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="md:ml-64 pt-16 md:pt-0 pb-20 md:pb-0 min-h-screen">
        <div className="p-4 md:p-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
