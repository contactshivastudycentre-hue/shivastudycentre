import { Link, useLocation } from 'react-router-dom';
import { Home, ClipboardList, User, BookOpen } from 'lucide-react';

const navItems = [
  { name: 'Home', path: '/dashboard', icon: Home, exact: true },
  { name: 'Tests', path: '/dashboard/tests', icon: ClipboardList },
  { name: 'Content', path: '/dashboard/content', icon: BookOpen, alt: ['/dashboard/notes', '/dashboard/videos'] },
  { name: 'Profile', path: '/dashboard/profile', icon: User },
];

export function BottomNav() {
  const location = useLocation();

  const isActive = (item: typeof navItems[number]) => {
    if (item.exact) return location.pathname === item.path;
    if (location.pathname.startsWith(item.path)) return true;
    return item.alt?.some((p) => location.pathname.startsWith(p)) ?? false;
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
