import { ClipboardList, CheckCircle2, Flame } from 'lucide-react';

interface StatsGridProps {
  availableTests: number;
  completedTests: number;
  avgScore: number;
  streakDays: number;
}

function CircularProgress({ value }: { value: number }) {
  const size = 56;
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (Math.min(100, Math.max(0, value)) / 100) * circ;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="hsl(var(--muted))"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="hsl(var(--primary))"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          fill="none"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-display font-bold text-foreground">{value}%</span>
      </div>
    </div>
  );
}

export function StatsGrid({ availableTests, completedTests, avgScore, streakDays }: StatsGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Available Tests */}
      <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
        <div className="flex items-start justify-between mb-2">
          <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-violet-600" />
          </div>
        </div>
        <p className="text-2xl font-display font-bold text-foreground leading-none">{availableTests}</p>
        <p className="text-xs text-muted-foreground mt-1.5">Available Tests</p>
      </div>

      {/* Completed Tests */}
      <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
        <div className="flex items-start justify-between mb-2">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
        </div>
        <p className="text-2xl font-display font-bold text-foreground leading-none">{completedTests}</p>
        <p className="text-xs text-muted-foreground mt-1.5">Completed Tests</p>
      </div>

      {/* Average Score (with circular progress) */}
      <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <CircularProgress value={avgScore} />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Average</p>
            <p className="text-sm font-display font-bold text-foreground">Score</p>
          </div>
        </div>
      </div>

      {/* Study Streak */}
      <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
        <div className="flex items-start justify-between mb-2">
          <div className={`w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center ${streakDays > 0 ? 'animate-pulse' : ''}`}>
            <Flame className={`w-5 h-5 ${streakDays > 0 ? 'text-orange-600' : 'text-orange-400'}`} />
          </div>
        </div>
        <p className="text-2xl font-display font-bold text-foreground leading-none">
          {streakDays}<span className="text-sm font-medium text-muted-foreground"> {streakDays === 1 ? 'day' : 'days'}</span>
        </p>
        <p className="text-xs text-muted-foreground mt-1.5">Study Streak</p>
      </div>
    </div>
  );
}
