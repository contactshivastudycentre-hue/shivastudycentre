import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';

/**
 * Branded full-screen loader that visually matches the PWA splash
 * so there is no flash of the public LandingPage on cold start.
 */
function BrandedSplash() {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background">
      <svg
        viewBox="0 0 80 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-28 h-28 animate-pulse"
      >
        <defs>
          <linearGradient id="splashGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="50%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
        <circle cx="40" cy="40" r="35" fill="url(#splashGradient2)" />
        <circle cx="40" cy="40" r="30" stroke="white" strokeWidth="1.5" strokeOpacity="0.3" fill="none" />
        <g transform="translate(20, 22)">
          <path d="M20 6 L20 34 C20 34 12 32 4 34 L4 8 C12 6 20 6 20 6Z" fill="white" fillOpacity="0.95" />
          <path d="M20 6 L20 34 C20 34 28 32 36 34 L36 8 C28 6 20 6 20 6Z" fill="white" fillOpacity="0.85" />
          <path d="M20 4 L20 36" stroke="white" strokeWidth="2" strokeOpacity="0.6" />
        </g>
        <text
          x="40"
          y="72"
          textAnchor="middle"
          fill="white"
          fontWeight="bold"
          fontSize="10"
          fontFamily="system-ui, sans-serif"
          letterSpacing="2"
        >
          SSC
        </text>
      </svg>
    </div>
  );
}

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
 *
 * IMPORTANT (PWA): Until the auth + profile lookup completes, we render a
 * branded splash matching index.html so there is no flash of the LandingPage
 * before redirecting an already-logged-in student to /dashboard.
 */
export function AuthRedirectGuard({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, profile, isLoading, profileLoaded } = useAuth();

  // Wait for BOTH the auth session AND (when a user exists) the profile
  // lookup before deciding what to render. This prevents the LandingPage
  // from flashing on PWA cold start when the user is already signed in.
  if (isLoading || (user && !profileLoaded)) {
    return <BrandedSplash />;
  }

  // If user is logged in, redirect to appropriate dashboard
  if (user) {
    if (isAdmin) return <Navigate to="/admin" replace />;
    if (profile?.status === 'approved') return <Navigate to="/dashboard" replace />;
    // Pending/inactive students stay on public pages.
  }

  return <>{children}</>;
}
