import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, X, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ChallengeData {
  challenger_name: string | null;
  score: number | null;
  test_title: string | null;
}

export default function ChallengeBanner() {
  const [params, setParams] = useSearchParams();
  const code = params.get('challenge');
  const [data, setData] = useState<ChallengeData | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    (async () => {
      const { data: row } = await supabase
        .from('challenge_shares')
        .select('challenger_name, score, test_title')
        .eq('referral_code', code)
        .maybeSingle();
      if (!cancelled && row) setData(row as ChallengeData);
    })();
    return () => { cancelled = true; };
  }, [code]);

  if (!code || dismissed || !data) return null;

  const challenger = data.challenger_name || 'A friend';
  const scoreText = data.score !== null ? ` (scored ${data.score})` : '';
  const testText = data.test_title ? ` on "${data.test_title}"` : '';

  const handleDismiss = () => {
    setDismissed(true);
    params.delete('challenge');
    setParams(params, { replace: true });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="sticky top-0 z-40 bg-gradient-to-r from-primary via-blue-600 to-purple-600 text-white shadow-lg"
      >
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <Trophy className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm sm:text-base truncate">
              🔥 {challenger} challenged you{testText}{scoreText}!
            </p>
            <p className="text-xs text-white/80 truncate">
              Sign up to take the test and beat their score.
            </p>
          </div>
          <Link
            to="/student/auth"
            className="flex-shrink-0 inline-flex items-center gap-1.5 bg-white text-primary px-4 py-2 rounded-full text-sm font-bold hover:bg-white/90 transition-colors"
          >
            Accept
            <ArrowRight className="w-4 h-4" />
          </Link>
          <button
            onClick={handleDismiss}
            aria-label="Dismiss"
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
