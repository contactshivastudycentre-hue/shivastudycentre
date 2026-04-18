import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Crown, Medal, Award } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Winner {
  test_id: string;
  test_title: string;
  test_class: string;
  test_type: string;
  results_published_at: string;
  rank: number;
  user_id: string;
  full_name: string;
  score: number;
  prize_text: string | null;
}

const RankIcon = ({ rank }: { rank: number }) => {
  if (rank === 1) return <Crown className="w-6 h-6 text-yellow-300" />;
  if (rank === 2) return <Medal className="w-6 h-6 text-gray-200" />;
  return <Award className="w-6 h-6 text-orange-300" />;
};

export function WinnersSlider() {
  const [index, setIndex] = useState(0);

  const { data: winners } = useQuery({
    queryKey: ['recent-winners'],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_recent_winners' as any, { p_days: 7 });
      return ((data as any) || []) as Winner[];
    },
    refetchInterval: 60000,
  });

  // Highlighted = published within last 24h
  const highlighted = (winners || []).filter(w => {
    const age = Date.now() - new Date(w.results_published_at).getTime();
    return age < 24 * 60 * 60 * 1000;
  });

  // Strict: only show winners published within last 24h, then auto-disappear
  const slides = highlighted;

  useEffect(() => {
    if (slides.length <= 1) return;
    const id = setInterval(() => setIndex(i => (i + 1) % slides.length), 4000);
    return () => clearInterval(id);
  }, [slides.length]);

  useEffect(() => {
    if (index >= slides.length) setIndex(0);
  }, [slides.length, index]);

  if (!slides.length) return null;
  const w = slides[index];

  return (
    <div>
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-base font-display font-bold text-foreground flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-500" /> Recent Winners
        </h2>
        <Link to="/dashboard/leaderboard" className="text-xs font-semibold text-primary hover:underline">
          View leaderboards →
        </Link>
      </div>

      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-4 text-white shadow-lg min-h-[140px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${w.test_id}-${w.rank}`}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.4 }}
            className="flex items-center gap-4"
          >
            <div className="w-14 h-14 rounded-full bg-white/15 backdrop-blur flex items-center justify-center flex-shrink-0">
              <RankIcon rank={w.rank} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-widest opacity-90 mb-1">
                🏆 Rank {w.rank} • Class {w.test_class}
              </div>
              <p className="font-display text-lg font-bold truncate">{w.full_name}</p>
              <p className="text-sm opacity-90 truncate">{w.test_title}</p>
              <div className="flex items-center gap-2 mt-1 text-xs">
                <span className="bg-white/20 rounded-full px-2 py-0.5">Score: {w.score}</span>
                {w.prize_text && <span className="bg-amber-400/30 rounded-full px-2 py-0.5">🎁 {w.prize_text}</span>}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {slides.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                aria-label={`Slide ${i + 1}`}
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition-all ${i === index ? 'bg-white w-5' : 'bg-white/50 w-1.5'}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
