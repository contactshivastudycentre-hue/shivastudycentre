import { Link, useLocation } from 'react-router-dom';
import { Home, FileText, Play, ClipboardList, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/auth';

const navItems = [
  { name: 'Home', path: '/dashboard', icon: Home },
  { name: 'Tests', path: '/dashboard/tests', icon: ClipboardList },
  { name: 'Notes', path: '/dashboard/notes', icon: FileText },
  { name: 'Videos', path: '/dashboard/videos', icon: Play },
];

export function BottomNav() {
  const location = useLocation();
  const { signOut } = useAuth();

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="bottom-nav safe-bottom">
      <div className="flex items-center justify-around">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`bottom-nav-item ${isActive(item.path) ? 'bottom-nav-item-active' : ''}`}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-xs font-medium">{item.name}</span>
          </Link>
        ))}
        <button
          onClick={signOut}
          className="bottom-nav-item text-destructive"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-xs font-medium">Logout</span>
        </button>
      </div>
    </nav>
  );
}
