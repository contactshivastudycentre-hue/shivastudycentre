import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';

/**
 * AuthRedirectGuard - Redirects authenticated users away from public pages
 * 
 * If user is logged in:
 * - Admin → redirects to /admin
 * - Approved Student → redirects to /dashboard
 * - Pending/Inactive Student → stays on public pages (can't access dashboard)
 * 
 * If user is not logged in:
 * - Allows access to public pages
 */
export function AuthRedirectGuard({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, profile, isLoading } = useAuth();

  // Show nothing while loading auth state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // If user is logged in, redirect to appropriate dashboard
  if (user) {
    // Admin users go to admin dashboard
    if (isAdmin) {
      return <Navigate to="/admin" replace />;
    }
    
    // Approved students go to student dashboard
    if (profile?.status === 'approved') {
      return <Navigate to="/dashboard" replace />;
    }
    
    // Pending/inactive students can still see public pages
    // They can't access dashboard anyway
  }

  // Not logged in or pending/inactive - show public content
  return <>{children}</>;
}
