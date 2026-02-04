import { motion } from 'framer-motion';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

const sizes = {
  sm: { icon: 32, text: 'text-lg' },
  md: { icon: 40, text: 'text-xl' },
  lg: { icon: 56, text: 'text-2xl' },
  xl: { icon: 80, text: 'text-4xl' },
};

export function Logo({ size = 'md', showText = true, className = '' }: LogoProps) {
  const { icon, text } = sizes[size];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <motion.div
        whileHover={{ scale: 1.05, rotate: 2 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      >
        <svg
          width={icon}
          height={icon}
          viewBox="0 0 80 80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-lg"
        >
          {/* Background Circle with Gradient */}
          <defs>
            <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--primary))" />
              <stop offset="50%" stopColor="hsl(var(--accent-gradient))" />
              <stop offset="100%" stopColor="hsl(var(--secondary-gradient))" />
            </linearGradient>
            <linearGradient id="glowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
              <stop offset="100%" stopColor="hsl(var(--accent-gradient))" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          
          {/* Outer Glow Ring */}
          <circle cx="40" cy="40" r="38" fill="url(#glowGradient)" />
          
          {/* Main Circle */}
          <circle cx="40" cy="40" r="35" fill="url(#logoGradient)" />
          
          {/* Inner Ring */}
          <circle cx="40" cy="40" r="30" stroke="white" strokeWidth="1.5" strokeOpacity="0.3" fill="none" />
          
          {/* Book Symbol - Open Book */}
          <g transform="translate(20, 22)">
            {/* Left Page */}
            <path
              d="M20 6 L20 34 C20 34 12 32 4 34 L4 8 C12 6 20 6 20 6Z"
              fill="white"
              fillOpacity="0.95"
            />
            {/* Right Page */}
            <path
              d="M20 6 L20 34 C20 34 28 32 36 34 L36 8 C28 6 20 6 20 6Z"
              fill="white"
              fillOpacity="0.85"
            />
            {/* Spine */}
            <path
              d="M20 4 L20 36"
              stroke="white"
              strokeWidth="2"
              strokeOpacity="0.6"
            />
            {/* Page Lines Left */}
            <path d="M8 14 L17 13" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeOpacity="0.4" strokeLinecap="round" />
            <path d="M8 19 L17 18" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeOpacity="0.4" strokeLinecap="round" />
            <path d="M8 24 L17 23" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeOpacity="0.4" strokeLinecap="round" />
            {/* Page Lines Right */}
            <path d="M23 13 L32 14" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeOpacity="0.4" strokeLinecap="round" />
            <path d="M23 18 L32 19" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeOpacity="0.4" strokeLinecap="round" />
            <path d="M23 23 L32 24" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeOpacity="0.4" strokeLinecap="round" />
          </g>
          
          {/* SSC Text - Small at Bottom */}
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
      </motion.div>
      
      {showText && (
        <div className="flex flex-col">
          <motion.span
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className={`font-display font-bold text-foreground ${text} leading-tight`}
          >
            Shiva Study Center
          </motion.span>
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-xs text-muted-foreground tracking-wider uppercase"
          >
            Excellence in Education
          </motion.span>
        </div>
      )}
    </div>
  );
}

export function LogoIcon({ size = 40, className = '' }: { size?: number; className?: string }) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`drop-shadow-lg ${className}`}
      whileHover={{ scale: 1.05 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
    >
      <defs>
        <linearGradient id="logoGradientIcon" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--primary))" />
          <stop offset="50%" stopColor="hsl(var(--accent-gradient))" />
          <stop offset="100%" stopColor="hsl(var(--secondary-gradient))" />
        </linearGradient>
      </defs>
      
      <circle cx="40" cy="40" r="35" fill="url(#logoGradientIcon)" />
      <circle cx="40" cy="40" r="30" stroke="white" strokeWidth="1.5" strokeOpacity="0.3" fill="none" />
      
      <g transform="translate(20, 22)">
        <path d="M20 6 L20 34 C20 34 12 32 4 34 L4 8 C12 6 20 6 20 6Z" fill="white" fillOpacity="0.95" />
        <path d="M20 6 L20 34 C20 34 28 32 36 34 L36 8 C28 6 20 6 20 6Z" fill="white" fillOpacity="0.85" />
        <path d="M20 4 L20 36" stroke="white" strokeWidth="2" strokeOpacity="0.6" />
      </g>
      
      <text x="40" y="72" textAnchor="middle" fill="white" fontWeight="bold" fontSize="10" fontFamily="system-ui, sans-serif" letterSpacing="2">SSC</text>
    </motion.svg>
  );
}
