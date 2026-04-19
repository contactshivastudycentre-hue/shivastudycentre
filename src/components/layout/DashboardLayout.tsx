import { Outlet, Link, useLocation, Navigate } from 'react-router-dom';
import { Home, FileText, Play, ClipboardList, User, LogOut, BookOpen, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { BottomNav } from './BottomNav';
import { Logo, LogoIcon } from '@/components/Logo';
import { SmallPWAButton } from '@/components/pwa/SmallPWAButton';
import { DesktopBlockGuard } from '@/components/guards/DesktopBlockGuard';
import { NotificationBell } from '@/components/NotificationBell';
import { RoleBadge } from '@/components/RoleBadge';

const sidebarItems = [
  { name: 'Dashboard', path: '/dashboard', icon: Home },
  { name: 'Tests', path: '/dashboard/tests', icon: ClipboardList },
  { name: 'Notes', path: '/dashboard/notes', icon: FileText },
  { name: 'Videos', path: '/dashboard/videos', icon: Play },
  { name: 'Profile', path: '/dashboard/profile', icon: User },
];

export function DashboardLayout() {
  const location = useLocation();
  const { user, profile, isLoading, profileLoaded, profileMissing, signOut } = useAuth();

  // Wait for BOTH session restore AND first profile fetch before rendering
  // any state-dependent UI. This prevents the "Profile Not Found" flash that
  // appears between session-restore and the async profile query.
  if (isLoading || (user && !profileLoaded)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Loading your dashboard…</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/student-login" replace />;
  }

  // Only show "missing profile" screen when backend has explicitly confirmed
  // the row does not exist. Transient/network errors no longer trigger this.
  if (!profile) {
    if (profileMissing) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="text-center max-w-sm">
            <h2 className="text-xl font-semibold mb-2">Complete your registration</h2>
            <p className="text-muted-foreground mb-4">
              We couldn't find your student profile. Please complete registration to continue.
            </p>
            <Button onClick={signOut}>Sign Out</Button>
          </div>
        </div>
      );
    }
    // Network glitch — keep the spinner instead of the false "not found" screen.
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Loading your dashboard…</p>
      </div>
    );
  }

  // Force users to complete their profile before accessing the dashboard.
  // (status='approved' but profile_completed=false means they signed up
  // but haven't filled the required school/grade/phone fields yet.)
  const profileCompleted = (profile as any).profile_completed !== false;
  if (!profileCompleted) {
    return <Navigate to="/complete-profile" replace />;
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
    <DesktopBlockGuard>
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
          <div className="mb-3 px-4 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-foreground truncate">{profile.full_name}</p>
              <p className="text-sm text-muted-foreground truncate">{profile.class || 'Student'}</p>
            </div>
            <RoleBadge role="student" />
          </div>
          <Button variant="ghost" className="w-full justify-start" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-[60px] bg-card border-b border-border z-40 flex items-center justify-between px-3">
        <Link to="/dashboard" className="flex items-center gap-2 min-w-0">
          <LogoIcon size={36} />
          <div className="flex flex-col min-w-0">
            <span className="font-display text-[15px] font-bold text-foreground leading-tight truncate">
              Shiva Study Center
            </span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider leading-tight">
              Powered by LeadPe
            </span>
          </div>
        </Link>
        <div className="flex items-center gap-1 shrink-0">
          <NotificationBell />
          <SmallPWAButton variant="header" />
        </div>
      </header>

      {/* Main Content */}
      <main className="md:ml-64 pt-[60px] md:pt-0 pb-20 md:pb-0 min-h-screen">
        <div className="p-3 md:p-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNav />
    </div>
    </DesktopBlockGuard>
  );
}
