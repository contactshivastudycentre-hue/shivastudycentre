import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Crown, Medal, Award, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';
import ChallengeFriendButton from '@/components/ChallengeFriendButton';

export default function LeaderboardPage() {
  const { eventId } = useParams();
  const { user } = useAuth();

  const { data: event } = useQuery({
    queryKey: ['event-detail', eventId],
    queryFn: async () => {
      const { data } = await supabase.from('test_events').select('*').eq('id', eventId!).single() as any;
      if (data) {
        const { data: prizes } = await supabase.from('event_prizes').select('*').eq('event_id', data.id);
        data.event_prizes = prizes || [];
      }
      return data;
    },
    enabled: !!eventId,
  });

  const { data: leaderboard, isLoading } = useQuery({
    queryKey: ['student-leaderboard', eventId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_event_leaderboard' as any, { p_event_id: eventId });
      if (error) {
        console.error('[Leaderboard] RPC error:', error);
        return [];
      }
      return ((data as any[]) || []).map((row) => ({
        rank: Number(row.rank),
        user_id: row.user_id,
        name: row.full_name,
        score: row.score ?? 0,
        time: row.time_seconds ?? 0,
        isMe: row.user_id === user?.id,
      }));
    },
    enabled: !!eventId && !!event?.results_approved,
  });

  const prize = event?.event_prizes?.[0];
  const fmt = (s: number) => `${Math.floor(s / 60)}m ${s % 60}s`;

  const RankDisplay = ({ rank }: { rank: number }) => {
    if (rank === 1) return <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 flex items-center justify-center shadow-lg"><Crown className="w-5 h-5 text-white" /></div>;
    if (rank === 2) return <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center shadow-lg"><Medal className="w-5 h-5 text-white" /></div>;
    if (rank === 3) return <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-300 to-amber-500 flex items-center justify-center shadow-lg"><Award className="w-5 h-5 text-white" /></div>;
    return <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"><span className="font-bold text-muted-foreground">#{rank}</span></div>;
  };

  if (!event?.results_approved) {
    return (
      <div className="space-y-4">
        <Link to="/dashboard"><Button variant="ghost"><ArrowLeft className="w-4 h-4 mr-2" />Back</Button></Link>
        <Card><CardContent className="py-16 text-center text-muted-foreground">Results not yet published.</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link to="/dashboard"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-2" />Back</Button></Link>

      {/* Event Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl hero-gradient p-6 text-white">
        <div className="flex items-center gap-2 mb-2">
          <Trophy className="w-6 h-6 text-yellow-300" />
          <h1 className="text-xl font-display font-bold">{event?.event_name}</h1>
        </div>
        {prize && (
          <div className="flex flex-wrap gap-3 mt-3">
            {prize.first_prize && <span className="bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-sm">🥇 {prize.first_prize}</span>}
            {prize.second_prize && <span className="bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-sm">🥈 {prize.second_prize}</span>}
            {prize.third_prize && <span className="bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-sm">🥉 {prize.third_prize}</span>}
          </div>
        )}
      </motion.div>

      {/* Top 3 Podium */}
      {leaderboard && leaderboard.length >= 3 && (
        <div className="grid grid-cols-3 gap-2">
          {[1, 0, 2].map(idx => {
            const e = leaderboard[idx];
            if (!e) return null;
            const colors = ['border-yellow-400 bg-yellow-50', 'border-gray-300 bg-gray-50', 'border-orange-400 bg-orange-50'];
            const heights = ['pt-4', 'pt-8', 'pt-10'];
            const emojis = ['🥇', '🥈', '🥉'];
            return (
              <motion.div
                key={e.rank}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
                className={`flex flex-col items-center ${heights[idx]}`}
              >
                <span className="text-2xl">{emojis[idx]}</span>
                <p className={`font-display font-bold text-sm text-center mt-1 ${e.isMe ? 'text-primary' : 'text-foreground'}`}>{e.name}</p>
                <p className="text-lg font-bold text-primary">{e.score}</p>
                <p className="text-xs text-muted-foreground">{fmt(e.time)}</p>
                <div className={`w-full h-16 sm:h-20 rounded-t-xl mt-2 border-2 ${colors[idx]} flex items-center justify-center`}>
                  <span className="font-display font-bold text-lg text-foreground">#{e.rank}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Full Rankings */}
      <Card>
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Trophy className="w-5 h-5" />Full Rankings</CardTitle></CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-6 text-center text-muted-foreground">Loading...</p>
          ) : !leaderboard?.length ? (
            <p className="p-6 text-center text-muted-foreground">No results yet</p>
          ) : (
            <div className="divide-y">
              {leaderboard.map(entry => (
                <motion.div
                  key={entry.rank}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`flex items-center gap-3 p-3 ${entry.isMe ? 'bg-primary/5 border-l-4 border-l-primary' : ''}`}
                >
                  <RankDisplay rank={entry.rank} />
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium truncate ${entry.isMe ? 'text-primary font-bold' : 'text-foreground'}`}>
                      {entry.name} {entry.isMe && '(You)'}
                    </p>
                    <p className="text-xs text-muted-foreground">{fmt(entry.time)}</p>
                  </div>
                  <span className="font-display font-bold text-lg text-primary">{entry.score}</span>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Challenge a Friend (if current user is on the board) */}
      {leaderboard?.some(e => e.isMe) && (() => {
        const me = leaderboard.find(e => e.isMe)!;
        return (
          <ChallengeFriendButton
            testId={event?.test_id || undefined}
            score={me.score}
            testTitle={event?.event_name}
            rank={me.rank}
          />
        );
      })()}
    </div>
  );
}
