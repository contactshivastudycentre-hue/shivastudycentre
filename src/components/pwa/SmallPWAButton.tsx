import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface SmallPWAButtonProps {
  variant?: 'header' | 'landing';
  className?: string;
}

export function SmallPWAButton({ variant = 'header', className = '' }: SmallPWAButtonProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if mobile or tablet
    const checkDevice = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet/i.test(userAgent);
      const isSmallScreen = window.innerWidth < 1024;
      setIsMobileOrTablet(isMobileDevice || isSmallScreen);
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);

    // Check if already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Listen for install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Listen for successful install
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('resize', checkDevice);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
    } catch (error) {
      console.error('Install prompt error:', error);
    }
    
    setDeferredPrompt(null);
  };

  // Don't show on desktop, if installed, or if no prompt available
  if (!isMobileOrTablet || isInstalled || !deferredPrompt) {
    return null;
  }

  if (variant === 'landing') {
    return (
      <Button 
        onClick={handleInstall}
        size="sm"
        variant="outline"
        className={`gap-2 rounded-full border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary ${className}`}
      >
        <Download className="w-4 h-4" />
        <span className="text-sm">Get App</span>
      </Button>
    );
  }

  // Header variant - minimal icon button
  return (
    <Button 
      onClick={handleInstall}
      size="sm"
      variant="ghost"
      className={`gap-1.5 h-8 px-3 text-xs rounded-full bg-primary/10 hover:bg-primary/20 text-primary ${className}`}
    >
      <Download className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">Download</span>
    </Button>
  );
}
