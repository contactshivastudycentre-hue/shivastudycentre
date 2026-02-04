import { Link, useLocation } from 'react-router-dom';
import { Menu, X, LogIn, LogOut, Shield, UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Logo } from '@/components/Logo';
import { motion, AnimatePresence } from 'framer-motion';

const publicLinks = [
  { name: 'Home', path: '/' },
  { name: 'About', path: '/about' },
  { name: 'Contact', path: '/contact' },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { user, profile, isAdmin, signOut } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  // Determine logo destination based on auth state
  const getLogoDestination = () => {
    if (!user) return '/';
    if (isAdmin) return '/admin';
    if (profile?.status === 'approved') return '/dashboard';
    return '/'; // Pending/inactive users go to landing
  };

  const handleSignOut = async () => {
    await signOut();
    setMobileMenuOpen(false);
  };

  return (
    <motion.header 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border/50"
    >
      <nav className="container mx-auto px-4 h-20 flex items-center justify-between">
        {/* Logo - redirects based on auth state */}
        <Link to={getLogoDestination()}>
          <Logo size="md" />
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          {publicLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`nav-link ${isActive(link.path) ? 'nav-link-active' : ''}`}
            >
              {link.name}
            </Link>
          ))}

          {user ? (
            <div className="flex items-center gap-4">
              {isAdmin ? (
                <Link to="/admin">
                  <Button variant="outline" size="sm" className="rounded-xl">
                    Admin Panel
                  </Button>
                </Link>
              ) : profile?.status === 'approved' ? (
                <Link to="/dashboard">
                  <Button variant="outline" size="sm" className="rounded-xl">
                    Dashboard
                  </Button>
                </Link>
              ) : null}
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="rounded-xl">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link to="/student-login">
                <Button size="sm" className="bg-primary hover:bg-primary/90 rounded-xl px-5">
                  <UserCircle className="w-4 h-4 mr-2" />
                  Student
                </Button>
              </Link>
              <Link to="/admin-login">
                <Button size="sm" variant="outline" className="rounded-xl px-5">
                  <Shield className="w-4 h-4 mr-2" />
                  Admin
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          className="md:hidden p-2 rounded-xl hover:bg-accent transition-colors"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? (
            <X className="w-6 h-6 text-foreground" />
          ) : (
            <Menu className="w-6 h-6 text-foreground" />
          )}
        </motion.button>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden bg-card border-b border-border overflow-hidden"
          >
            <div className="container mx-auto px-4 py-4 flex flex-col gap-2">
              {publicLinks.map((link, index) => (
                <motion.div
                  key={link.path}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link
                    to={link.path}
                    className={`block py-3 px-4 rounded-xl transition-colors ${
                      isActive(link.path) 
                        ? 'bg-accent text-primary font-semibold' 
                        : 'text-foreground hover:bg-accent'
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {link.name}
                  </Link>
                </motion.div>
              ))}
              
              <div className="pt-4 mt-2 border-t border-border space-y-2">
                {user ? (
                  <>
                    {isAdmin ? (
                      <Link to="/admin" onClick={() => setMobileMenuOpen(false)}>
                        <Button variant="outline" className="w-full rounded-xl">
                          Admin Panel
                        </Button>
                      </Link>
                    ) : profile?.status === 'approved' ? (
                      <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                        <Button variant="outline" className="w-full rounded-xl">
                          Dashboard
                        </Button>
                      </Link>
                    ) : null}
                    <Button variant="ghost" className="w-full justify-start rounded-xl" onClick={handleSignOut}>
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </Button>
                  </>
                ) : (
                  <div className="space-y-2">
                    <Link to="/student-login" onClick={() => setMobileMenuOpen(false)}>
                      <Button className="w-full bg-primary hover:bg-primary/90 rounded-xl">
                        <UserCircle className="w-4 h-4 mr-2" />
                        Student Login
                      </Button>
                    </Link>
                    <Link to="/admin-login" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="outline" className="w-full rounded-xl">
                        <Shield className="w-4 h-4 mr-2" />
                        Admin Login
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
