import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Trophy, Ban, RefreshCw, Medal, Crown, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LeaderboardEntry {
  rank: number;
  attempt_id: string;
  user_id: string;
  student_name: string;
  score: number;
  time_taken: number; // seconds
  is_banned: boolean;
  class: string;
}

export default function AdminLeaderboardPage() {
  const qc = useQueryClient();
  const [selectedEvent, setSelectedEvent] = useState('');

  const { data: events } = useQuery({
    queryKey: ['admin-events-for-lb'],
    queryFn: async () => {
      const { data } = await supabase.from('test_events').select('id, event_name, test_id, results_approved').order('created_at', { ascending: false });
      return data || [];
    },
  });

  const event = events?.find(e => e.id === selectedEvent);

  const { data: leaderboard, isLoading } = useQuery({
    queryKey: ['admin-leaderboard', selectedEvent],
    queryFn: async () => {
      if (!event?.test_id) return [];
      const { data: attempts, error } = await supabase
        .from('test_attempts')
        .select('id, user_id, score, mcq_score, started_at, submitted_at, is_banned')
        .eq('test_id', event.test_id)
        .not('submitted_at', 'is', null)
        .order('score', { ascending: false });
      if (error) throw error;
      if (!attempts?.length) return [];

      const userIds = [...new Set(attempts.map(a => a.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, class')
        .in('user_id', userIds);
      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

      let rank = 0;
      return attempts.map((a, i) => {
        const profile = profileMap.get(a.user_id);
        const timeTaken = a.submitted_at && a.started_at
          ? Math.round((new Date(a.submitted_at).getTime() - new Date(a.started_at).getTime()) / 1000)
          : 0;
        if (!a.is_banned) rank++;
        return {
          rank: a.is_banned ? -1 : rank,
          attempt_id: a.id,
          user_id: a.user_id,
          student_name: profile?.full_name || 'Unknown',
          score: a.score ?? a.mcq_score ?? 0,
          time_taken: timeTaken,
          is_banned: a.is_banned ?? false,
          class: profile?.class || '',
        } as LeaderboardEntry;
      });
    },
    enabled: !!event?.test_id,
  });

  const banMutation = useMutation({
    mutationFn: async ({ attemptId, ban }: { attemptId: string; ban: boolean }) => {
      const { error } = await supabase.from('test_attempts').update({ is_banned: ban } as any).eq('id', attemptId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-leaderboard', selectedEvent] });
      toast({ title: 'Leaderboard updated' });
    },
  });

  const approveResults = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('test_events').update({ results_approved: true }).eq('id', selectedEvent);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-events-for-lb'] });
      toast({ title: 'Results approved and published!' });
    },
  });

  const activeEntries = leaderboard?.filter(e => !e.is_banned) || [];
  const bannedEntries = leaderboard?.filter(e => e.is_banned) || [];

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  }

  const RankIcon = ({ rank }: { rank: number }) => {
    if (rank === 1) return <Crown className="w-6 h-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-gray-400" />;
    if (rank === 3) return <Award className="w-6 h-6 text-amber-600" />;
    return <span className="w-6 h-6 flex items-center justify-center text-sm font-bold text-muted-foreground">#{rank}</span>;
  };

  const rankBg = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200';
    if (rank === 2) return 'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200';
    if (rank === 3) return 'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200';
    return 'bg-card border-border';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Leaderboard</h1>
        <p className="text-muted-foreground">View rankings, ban cheaters, and approve results</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={selectedEvent} onValueChange={setSelectedEvent}>
          <SelectTrigger className="w-full sm:w-72"><SelectValue placeholder="Select event" /></SelectTrigger>
          <SelectContent>
            {events?.map(e => <SelectItem key={e.id} value={e.id}>{e.event_name}</SelectItem>)}
          </SelectContent>
        </Select>
        {event && !event.results_approved && (
          <Button onClick={() => approveResults.mutate()} disabled={approveResults.isPending} className="bg-green-600 hover:bg-green-700">
            <Trophy className="w-4 h-4 mr-2" />Approve & Publish Results
          </Button>
        )}
        {event?.results_approved && <Badge className="bg-green-100 text-green-700 h-10 px-4 flex items-center">✅ Results Published</Badge>}
      </div>

      {!selectedEvent ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">Select an event to view leaderboard</CardContent></Card>
      ) : isLoading ? (
        <p className="text-muted-foreground">Loading leaderboard...</p>
      ) : !activeEntries.length && !bannedEntries.length ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">No submissions yet</CardContent></Card>
      ) : (
        <div className="space-y-6">
          {/* Top 3 Podium */}
          {activeEntries.length >= 3 && (
            <div className="grid grid-cols-3 gap-3">
              {[1, 0, 2].map(idx => {
                const entry = activeEntries[idx];
                if (!entry) return null;
                const colors = [
                  'from-yellow-400 to-amber-500',
                  'from-gray-300 to-gray-400',
                  'from-orange-400 to-amber-500',
                ];
                const heights = ['h-32', 'h-24', 'h-20'];
                const labels = ['🥇', '🥈', '🥉'];
                const order = idx === 1 ? 0 : idx === 0 ? 1 : 2;
                return (
                  <motion.div
                    key={entry.attempt_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: order * 0.15 }}
                    className="flex flex-col items-center"
                  >
                    <span className="text-3xl mb-1">{labels[idx]}</span>
                    <p className="font-display font-bold text-foreground text-sm text-center truncate w-full">{entry.student_name}</p>
                    <p className="text-lg font-bold text-primary">{entry.score}</p>
                    <p className="text-xs text-muted-foreground">{formatTime(entry.time_taken)}</p>
                    <div className={`w-full ${heights[idx]} bg-gradient-to-t ${colors[idx]} rounded-t-xl mt-2 flex items-end justify-center pb-2`}>
                      <span className="text-white font-bold text-lg">#{entry.rank}</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Full Leaderboard Table */}
          <Card>
            <CardHeader><CardTitle className="text-lg">Full Rankings</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Rank</th>
                      <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Student</th>
                      <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Score</th>
                      <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Time</th>
                      <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Class</th>
                      <th className="text-right p-3 text-xs font-semibold text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                      {activeEntries.map((entry, i) => (
                        <motion.tr
                          key={entry.attempt_id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className={`border-b ${rankBg(entry.rank)}`}
                        >
                          <td className="p-3"><RankIcon rank={entry.rank} /></td>
                          <td className="p-3 font-medium text-foreground">{entry.student_name}</td>
                          <td className="p-3 font-bold text-primary">{entry.score}</td>
                          <td className="p-3 text-sm text-muted-foreground">{formatTime(entry.time_taken)}</td>
                          <td className="p-3 text-sm text-muted-foreground">{entry.class}</td>
                          <td className="p-3 text-right">
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => banMutation.mutate({ attemptId: entry.attempt_id, ban: true })}>
                              <Ban className="w-4 h-4 mr-1" />Ban
                            </Button>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Banned Students */}
          {bannedEntries.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-lg text-destructive">Banned Students</CardTitle></CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-red-50">
                        <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Student</th>
                        <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Score</th>
                        <th className="text-right p-3 text-xs font-semibold text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bannedEntries.map(entry => (
                        <tr key={entry.attempt_id} className="border-b bg-red-50/50">
                          <td className="p-3 font-medium text-foreground line-through opacity-60">{entry.student_name}</td>
                          <td className="p-3 text-muted-foreground line-through opacity-60">{entry.score}</td>
                          <td className="p-3 text-right">
                            <Button size="sm" variant="outline" onClick={() => banMutation.mutate({ attemptId: entry.attempt_id, ban: false })}>
                              <RefreshCw className="w-4 h-4 mr-1" />Unban
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
