import { useState } from 'react';
import { Outlet, Link, useLocation, Navigate } from 'react-router-dom';
import { Users, FileText, Play, ClipboardList, LogOut, Home, KeyRound, BarChart3, CalendarDays, Image as ImageIcon, Trophy, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { Logo, LogoIcon } from '@/components/Logo';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { NotificationBell } from '@/components/NotificationBell';
import { RoleBadge } from '@/components/RoleBadge';

const sidebarItems = [
  { name: 'Dashboard', path: '/admin', icon: Home },
  { name: 'Students', path: '/admin/students', icon: Users },
  { name: 'Tests', path: '/admin/tests', icon: ClipboardList },
  { name: 'Results', path: '/admin/results', icon: BarChart3 },
  { name: 'Events', path: '/admin/events', icon: CalendarDays },
  { name: 'Banners', path: '/admin/banners', icon: ImageIcon },
  { name: 'Leaderboard', path: '/admin/leaderboard', icon: Trophy },
  { name: 'Notes', path: '/admin/notes', icon: FileText },
  { name: 'Videos', path: '/admin/videos', icon: Play },
  { name: 'Password Resets', path: '/admin/password-resets', icon: KeyRound },
];

const moreItems = [
  { name: 'Events', path: '/admin/events', icon: CalendarDays, description: 'Sunday tests & specials' },
  { name: 'Banners', path: '/admin/banners', icon: ImageIcon, description: 'Dashboard announcements' },
  { name: 'Leaderboard', path: '/admin/leaderboard', icon: Trophy, description: 'Approve results & rankings' },
  { name: 'Notes', path: '/admin/notes', icon: FileText, description: 'Study materials' },
  { name: 'Videos', path: '/admin/videos', icon: Play, description: 'Video lectures' },
  { name: 'Password Resets', path: '/admin/password-resets', icon: KeyRound, description: 'Reset student passwords' },
];

export function AdminLayout() {
  const location = useLocation();
  const { user, isAdmin, isLoading, profileLoaded, signOut } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin-login" replace />;
  }

  // Wait for profile/role to load before deciding
  if (!profileLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const isActive = (path: string) => {
    if (path === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-64 bg-card border-r border-border flex-col">
        {/* Logo */}
        <div className="p-4 border-b border-border">
          <Link to="/admin" className="block">
            <div className="flex items-center gap-3">
              <LogoIcon size={40} />
              <div className="flex flex-col">
                <span className="font-display text-lg font-bold text-foreground leading-tight">
                  Shiva Study Center
                </span>
                <span className="text-xs text-primary font-medium">Admin Panel</span>
              </div>
            </div>
          </Link>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Powered by LeadPe
            </p>
            <RoleBadge role="admin" />
          </div>
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

        {/* Logout */}
        <div className="p-4 border-t border-border">
          <Button variant="ghost" className="w-full justify-start" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-16 bg-card border-b border-border z-40 flex items-center justify-between px-4">
        <Link to="/admin" className="flex items-center gap-2">
          <LogoIcon size={32} />
          <div className="flex flex-col">
            <span className="font-display text-base font-bold text-foreground leading-tight">
              SSC Admin
            </span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Powered by LeadPe
            </span>
          </div>
        </Link>
        <div className="flex items-center gap-1">
          <NotificationBell />
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Mobile Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-40 safe-bottom">
        <div className="flex items-center justify-around py-2">
          {/* Dashboard */}
          <Link
            to="/admin"
            className={`flex flex-col items-center justify-center gap-1 p-2 ${
              isActive('/admin') ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-xs font-medium">Home</span>
          </Link>

          {/* Students */}
          <Link
            to="/admin/students"
            className={`flex flex-col items-center justify-center gap-1 p-2 ${
              isActive('/admin/students') ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="text-xs font-medium">Students</span>
          </Link>

          {/* Tests */}
          <Link
            to="/admin/tests"
            className={`flex flex-col items-center justify-center gap-1 p-2 ${
              isActive('/admin/tests') ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <ClipboardList className="w-5 h-5" />
            <span className="text-xs font-medium">Tests</span>
          </Link>

          {/* More (Events / Banners / Leaderboard / Notes / Videos / Resets) */}
          <MoreSheet isActive={isActive} />

          {/* Results */}
          <Link
            to="/admin/results"
            className={`flex flex-col items-center justify-center gap-1 p-2 ${
              isActive('/admin/results') ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            <span className="text-xs font-medium">Results</span>
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <main className="md:ml-64 pt-16 md:pt-0 pb-20 md:pb-0 min-h-screen">
        <div className="p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

// More Sheet — exposes Events, Banners, Leaderboard, Notes, Videos, Password Resets
function MoreSheet({ isActive }: { isActive: (path: string) => boolean }) {
  const [open, setOpen] = useState(false);
  const isAnyActive = moreItems.some(item => isActive(item.path));

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          className={`flex flex-col items-center justify-center gap-1 p-2 ${
            isAnyActive ? 'text-primary' : 'text-muted-foreground'
          }`}
        >
          <MoreHorizontal className="w-5 h-5" />
          <span className="text-xs font-medium">More</span>
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-3xl pb-8 max-h-[85vh] overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-lg font-display">Admin Tools</SheetTitle>
        </SheetHeader>
        <div className="grid grid-cols-2 gap-3">
          {moreItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setOpen(false)}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                isActive(item.path)
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-card hover:border-primary/50 hover:bg-accent'
              }`}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                isActive(item.path) ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}>
                <item.icon className="w-6 h-6" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-sm">{item.name}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{item.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
