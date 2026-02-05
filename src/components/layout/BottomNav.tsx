import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, FileText, Play, ClipboardList, User, BookOpen, X } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

const mainNavItems = [
  { name: 'Home', path: '/dashboard', icon: Home },
  { name: 'Tests', path: '/dashboard/tests', icon: ClipboardList },
];

const contentItems = [
  { name: 'Notes', path: '/dashboard/notes', icon: FileText, description: 'Download study materials' },
  { name: 'Videos', path: '/dashboard/videos', icon: Play, description: 'Watch video lectures' },
];

export function BottomNav() {
  const location = useLocation();
  const [contentOpen, setContentOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  const isContentActive = contentItems.some(item => location.pathname.startsWith(item.path));

  return (
    <>
      <nav className="bottom-nav safe-bottom">
        <div className="flex items-center justify-around">
          {/* Home */}
          <Link
            to="/dashboard"
            className={`bottom-nav-item ${isActive('/dashboard') ? 'bottom-nav-item-active' : ''}`}
          >
            <Home className="w-5 h-5" />
            <span className="text-xs font-medium">Home</span>
          </Link>

          {/* Tests */}
          <Link
            to="/dashboard/tests"
            className={`bottom-nav-item ${isActive('/dashboard/tests') ? 'bottom-nav-item-active' : ''}`}
          >
            <ClipboardList className="w-5 h-5" />
            <span className="text-xs font-medium">Tests</span>
          </Link>

          {/* Content (Notes + Videos) */}
          <Sheet open={contentOpen} onOpenChange={setContentOpen}>
            <SheetTrigger asChild>
              <button
                className={`bottom-nav-item ${isContentActive ? 'bottom-nav-item-active' : ''}`}
              >
                <BookOpen className="w-5 h-5" />
                <span className="text-xs font-medium">Content</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-3xl pb-8">
              <SheetHeader className="pb-4">
                <SheetTitle className="text-lg font-display">Study Content</SheetTitle>
              </SheetHeader>
              <div className="grid grid-cols-2 gap-4">
                {contentItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setContentOpen(false)}
                    className={`flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all ${
                      isActive(item.path)
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-card hover:border-primary/50 hover:bg-accent'
                    }`}
                  >
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                      isActive(item.path) ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}>
                      <item.icon className="w-7 h-7" />
                    </div>
                    <div className="text-center">
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </SheetContent>
          </Sheet>

          {/* Profile */}
          <Link
            to="/dashboard/profile"
            className={`bottom-nav-item ${isActive('/dashboard/profile') ? 'bottom-nav-item-active' : ''}`}
          >
            <User className="w-5 h-5" />
            <span className="text-xs font-medium">Profile</span>
          </Link>
        </div>
      </nav>
    </>
  );
}
