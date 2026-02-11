import { useIsMobile } from '@/hooks/use-mobile';
import { Monitor } from 'lucide-react';

/**
 * Blocks desktop users from accessing the web app (dashboard).
 * Only shows on screens wider than 768px (md breakpoint).
 * Website (public pages) is NOT affected.
 */
export function DesktopBlockGuard({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();

  // On mobile/tablet, show the app normally
  if (isMobile) {
    return <>{children}</>;
  }

  // On desktop, block access
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="max-w-md text-center">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <Monitor className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-2xl font-display font-bold text-foreground mb-3">
          Mobile App Only
        </h1>
        <p className="text-muted-foreground mb-6 leading-relaxed">
          Shiva Study Centre app is designed for mobile and tablet devices. Please open this on your phone or tablet for the best experience.
        </p>
        <div className="bg-muted rounded-xl p-4">
          <p className="text-sm text-muted-foreground">
            📱 Scan the QR code or visit <strong className="text-foreground">shivastudycentre.org</strong> on your mobile browser.
          </p>
        </div>
      </div>
    </div>
  );
}
