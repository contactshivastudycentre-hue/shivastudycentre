import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Winner {
  test_id: string;
  test_title: string;
  test_class: string;
  test_type: string;
  results_published_at: string;
  rank: number | null;
  user_id: string;
  full_name: string;
  score: number;
  prize_text: string | null;
  category?: string;
}

const rankStyle = (rank: number | null, category?: string) => {
  if (category === 'lucky') return { emoji: '🎁', color: 'text-purple-200', label: 'Lucky' };
  if (rank === 1) return { emoji: '🏆', color: 'text-yellow-300', label: '1st' };
  if (rank === 2) return { emoji: '🥈', color: 'text-gray-200', label: '2nd' };
  return { emoji: '🥉', color: 'text-orange-300', label: '3rd' };
};

export function WinnersSlider() {
  const { data: winners } = useQuery({
    queryKey: ['recent-winners'],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_recent_winners' as any, { p_days: 1 });
      return ((data as any) || []) as Winner[];
    },
    refetchInterval: 60000,
  });

  // Strict 24h window
  const items = (winners || []).filter(w => {
    const age = Date.now() - new Date(w.results_published_at).getTime();
    return age < 24 * 60 * 60 * 1000;
  });

  if (!items.length) return null;

  // Duplicate items so the marquee loops seamlessly
  const looped = [...items, ...items];

  return (
    <div>
      <div className="flex items-center justify-between mb-2 px-1">
        <h2 className="text-base font-display font-bold text-foreground flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-500" /> Recent Winners
        </h2>
        <Link to="/dashboard/leaderboard" className="text-xs font-semibold text-primary hover:underline">
          View leaderboards →
        </Link>
      </div>

      <div
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 py-3 shadow-lg group"
        aria-label="Recent test winners"
      >
        <div
          className="flex gap-8 whitespace-nowrap animate-[marquee_30s_linear_infinite] group-hover:[animation-play-state:paused]"
          style={{ width: 'max-content' }}
        >
          {looped.map((w, idx) => {
            const r = rankStyle(w.rank, w.category);
            return (
              <div
                key={`${w.test_id}-${w.rank ?? 'lucky'}-${idx}`}
                className="flex items-center gap-2 text-white text-sm font-medium px-2"
              >
                <span className={`text-lg ${r.color}`}>{r.emoji}</span>
                <span className={`text-xs font-bold uppercase tracking-wide ${r.color}`}>{r.label}</span>
                <span className="font-display font-semibold">{w.full_name}</span>
                <span className="opacity-70 text-xs">• Class {w.test_class}</span>
                <span className="opacity-70 text-xs">• Score {w.score}</span>
                {w.prize_text && (
                  <span className="bg-amber-400/30 text-amber-100 rounded-full px-2 py-0.5 text-xs font-semibold">
                    🎁 {w.prize_text}
                  </span>
                )}
                <span className="text-white/30 ml-4">•</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
