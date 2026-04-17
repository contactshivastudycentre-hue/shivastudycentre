import { ExternalLink, Sparkles, Zap } from 'lucide-react';

const LEADPE_URL = 'https://leadpe.tech?utm_source=ssc&utm_medium=app&utm_campaign=brand';

interface LeadPeAdProps {
  variant?: 'card' | 'inline' | 'footer-line';
  className?: string;
}

export function LeadPeAd({ variant = 'card', className = '' }: LeadPeAdProps) {
  if (variant === 'footer-line') {
    return (
      <p className={`text-center text-xs text-muted-foreground ${className}`}>
        Powered by{' '}
        <a
          href={LEADPE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary font-semibold hover:underline"
        >
          LeadPe.tech
        </a>{' '}
        — Build apps faster.
      </p>
    );
  }

  if (variant === 'inline') {
    return (
      <a
        href={LEADPE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-foreground text-background hover:bg-foreground/90 transition-colors text-sm font-medium ${className}`}
      >
        <Zap className="w-4 h-4 text-yellow-400" />
        Built by LeadPe
        <ExternalLink className="w-3.5 h-3.5 opacity-70" />
      </a>
    );
  }

  // card (default — for student dashboard)
  return (
    <a
      href={LEADPE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`block relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-5 shadow-md hover:shadow-lg transition-all active:scale-[0.98] ${className}`}
    >
      <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-yellow-400/20 blur-2xl" />
      <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-blue-500/20 blur-2xl" />
      <div className="relative flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shrink-0 shadow-md">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display font-bold text-white truncate flex items-center gap-1.5">
            LeadPe.tech
            <ExternalLink className="w-3 h-3 opacity-60" />
          </p>
          <p className="text-xs text-slate-300 truncate">
            Built this app? You can too. Build apps in minutes.
          </p>
        </div>
      </div>
    </a>
  );
}
