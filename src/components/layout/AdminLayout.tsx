import { Outlet, Link, useLocation, Navigate } from 'react-router-dom';
import { Users, FileText, Play, ClipboardList, LogOut, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { Logo, LogoIcon } from '@/components/Logo';

const sidebarItems = [
  { name: 'Dashboard', path: '/admin', icon: Home },
  { name: 'Students', path: '/admin/students', icon: Users },
  { name: 'Tests', path: '/admin/tests', icon: ClipboardList },
  { name: 'Notes', path: '/admin/notes', icon: FileText },
  { name: 'Videos', path: '/admin/videos', icon: Play },
];

export function AdminLayout() {
  const location = useLocation();
  const { user, isAdmin, isLoading, signOut } = useAuth();

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
          <p className="text-[10px] text-muted-foreground mt-2 uppercase tracking-wider">
            Powered by KAIRAUX
          </p>
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
              Powered by KAIRAUX
            </span>
          </div>
        </Link>
        <Button variant="ghost" size="sm" onClick={signOut}>
          <LogOut className="w-4 h-4" />
        </Button>
      </header>

      {/* Mobile Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-40 safe-bottom">
        <div className="flex items-center justify-around py-2">
          {sidebarItems.slice(0, 5).map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center gap-1 p-2 ${
                isActive(item.path) ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-xs font-medium">{item.name}</span>
            </Link>
          ))}
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
