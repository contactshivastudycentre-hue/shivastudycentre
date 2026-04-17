import { Link, useLocation } from 'react-router-dom';
import { Home, ClipboardList, FileText, Play, User } from 'lucide-react';

const navItems = [
  { name: 'Home', path: '/dashboard', icon: Home, exact: true },
  { name: 'Tests', path: '/dashboard/tests', icon: ClipboardList },
  { name: 'Notes', path: '/dashboard/notes', icon: FileText },
  { name: 'Videos', path: '/dashboard/videos', icon: Play },
  { name: 'Profile', path: '/dashboard/profile', icon: User },
];

export function BottomNav() {
  const location = useLocation();

  const isActive = (item: typeof navItems[number]) => {
    if (item.exact) return location.pathname === item.path;
    return location.pathname.startsWith(item.path);
  };

  return (
    <nav className="bottom-nav safe-bottom">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`bottom-nav-item ${active ? 'bottom-nav-item-active' : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-xs font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
