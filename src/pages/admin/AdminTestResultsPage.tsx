import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Trophy, Crown, Medal, Award, Eye, EyeOff, Loader2, Ban, RefreshCw, Clock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

interface AttemptRow {
  id: string;
  user_id: string;
  score: number | null;
  mcq_score: number | null;
  started_at: string;
  submitted_at: string | null;
  is_banned: boolean;
}

interface ProfileRow {
  user_id: string;
  full_name: string;
  class: string | null;
  mobile: string;
}

interface WinnerRow {
  id: string;
  rank: number;
  user_id: string;
  full_name: string | null;
  score: number | null;
  prize_text: string | null;
}

const fmtTime = (s: number) => `${Math.floor(s / 60)}m ${s % 60}s`;

export default function AdminTestResultsPage() {
  const { testId } = useParams<{ testId: string }>();
  const qc = useQueryClient();

  // Test info
  const { data: test, isLoading: testLoading } = useQuery({
    queryKey: ['admin-test', testId],
    queryFn: async () => {
      const { data } = await supabase.from('tests').select('*').eq('id', testId!).maybeSingle();
      return data as any;
    },
    enabled: !!testId,
  });

  // Attempts + profiles
  const { data: leaderboard, isLoading: lbLoading } = useQuery({
    queryKey: ['admin-test-leaderboard', testId],
    queryFn: async () => {
      const { data: attempts } = await supabase
        .from('test_attempts')
        .select('id, user_id, score, mcq_score, started_at, submitted_at, is_banned')
        .eq('test_id', testId!)
        .not('submitted_at', 'is', null);

      if (!attempts?.length) return [];
      const userIds = [...new Set((attempts as AttemptRow[]).map(a => a.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, class, mobile')
        .in('user_id', userIds);

      const profileMap = new Map<string, ProfileRow>();
      (profiles || []).forEach(p => profileMap.set(p.user_id, p as ProfileRow));

      const rows = (attempts as AttemptRow[])
        .filter(a => {
          const p = profileMap.get(a.user_id);
          return p && p.mobile !== '0000000000' && (p.full_name || '').toLowerCase() !== 'admin';
        })
        .map(a => {
          const p = profileMap.get(a.user_id);
          const t = a.submitted_at && a.started_at
            ? Math.round((new Date(a.submitted_at).getTime() - new Date(a.started_at).getTime()) / 1000)
            : 0;
          return {
            ...a,
            full_name: p?.full_name || 'Unknown',
            class: p?.class || '',
            time_taken: t,
            effective_score: a.score ?? a.mcq_score ?? 0,
          };
        })
        .sort((a, b) => b.effective_score - a.effective_score || a.time_taken - b.time_taken);

      // Assign rank skipping banned
      let rank = 0;
      return rows.map(r => ({
        ...r,
        rank: r.is_banned ? -1 : (++rank),
      }));
    },
    enabled: !!testId,
  });

  // Winners (post-publish)
  const { data: winners } = useQuery({
    queryKey: ['admin-test-winners', testId],
    queryFn: async () => {
      const { data } = await supabase
        .from('test_winners' as any)
        .select('id, rank, user_id, full_name, score, prize_text')
        .eq('test_id', testId!)
        .order('rank');
      return ((data as any) || []) as WinnerRow[];
    },
    enabled: !!testId && !!test?.results_published_at,
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('publish_test_results' as any, { p_test_id: testId! });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-test', testId] });
      qc.invalidateQueries({ queryKey: ['admin-test-winners', testId] });
      toast({ title: 'Results published 🎉', description: 'Top 3 winners auto-calculated. Add prize text below.' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const unpublishMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('unpublish_test_results' as any, { p_test_id: testId! });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-test', testId] });
      qc.invalidateQueries({ queryKey: ['admin-test-winners', testId] });
      toast({ title: 'Results unpublished' });
    },
  });

  const banMutation = useMutation({
    mutationFn: async ({ attemptId, ban }: { attemptId: string; ban: boolean }) => {
      const { error } = await supabase.from('test_attempts').update({ is_banned: ban }).eq('id', attemptId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-test-leaderboard', testId] }),
  });

  if (testLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }
  if (!test) {
    return <div className="text-center py-20 text-muted-foreground">Test not found</div>;
  }

  const isPublished = !!test.results_published_at;
  const active = (leaderboard || []).filter(r => !r.is_banned);
  const banned = (leaderboard || []).filter(r => r.is_banned);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex items-center gap-3 flex-wrap">
        <Link to="/admin/tests"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-display font-bold text-foreground truncate">{test.title}</h1>
          <p className="text-sm text-muted-foreground">Class {test.class} • {test.subject} • {test.test_type === 'sunday_special' ? '🔥 Sunday Special' : test.test_type}</p>
        </div>
        {isPublished ? (
          <Button variant="outline" className="gap-2 text-amber-700 border-amber-300" onClick={() => unpublishMutation.mutate()} disabled={unpublishMutation.isPending}>
            {unpublishMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <EyeOff className="w-4 h-4" />}
            Unpublish
          </Button>
        ) : (
          <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700" onClick={() => publishMutation.mutate()} disabled={publishMutation.isPending || !active.length}>
            {publishMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
            Publish Results
          </Button>
        )}
      </div>

      {!isPublished && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>Draft:</strong> Students can't see results yet. Click <strong>Publish Results</strong> to release the leaderboard and announce winners.
        </div>
      )}

      {isPublished && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 flex items-center gap-2">
          <Clock className="w-4 h-4" /> Highlighted on dashboards for <strong>24 hours</strong> from publish • Always visible on the Leaderboard page after that.
        </div>
      )}

      {/* Winners management */}
      {isPublished && winners && winners.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-500" />Winners & Prizes</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {winners.map(w => <WinnerRowEditor key={w.id} winner={w} onUpdated={() => qc.invalidateQueries({ queryKey: ['admin-test-winners', testId] })} />)}
          </CardContent>
        </Card>
      )}

      {/* Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Submissions ({active.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {lbLoading ? (
            <p className="p-6 text-center text-muted-foreground">Loading…</p>
          ) : !active.length && !banned.length ? (
            <p className="p-6 text-center text-muted-foreground">No submissions yet</p>
          ) : (
            <div className="divide-y">
              {active.map((row, i) => (
                <motion.div key={row.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="flex items-center gap-3 p-3">
                  <div className="w-10 flex-shrink-0">
                    {row.rank === 1 ? <Crown className="w-6 h-6 text-yellow-500" />
                      : row.rank === 2 ? <Medal className="w-6 h-6 text-gray-400" />
                      : row.rank === 3 ? <Award className="w-6 h-6 text-amber-600" />
                      : <span className="text-sm font-bold text-muted-foreground">#{row.rank}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{row.full_name}</p>
                    <p className="text-xs text-muted-foreground">Class {row.class} • {fmtTime(row.time_taken)}</p>
                  </div>
                  <Badge variant="outline" className="font-bold">{row.effective_score}</Badge>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => banMutation.mutate({ attemptId: row.id, ban: true })}>
                    <Ban className="w-4 h-4" />
                  </Button>
                </motion.div>
              ))}
              {banned.map(row => (
                <div key={row.id} className="flex items-center gap-3 p-3 bg-destructive/5">
                  <span className="w-10 text-xs text-destructive">BAN</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium line-through opacity-60 truncate">{row.full_name}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => banMutation.mutate({ attemptId: row.id, ban: false })}>
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function WinnerRowEditor({ winner, onUpdated }: { winner: WinnerRow; onUpdated: () => void }) {
  const [text, setText] = useState(winner.prize_text || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => { setText(winner.prize_text || ''); }, [winner.prize_text]);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.rpc('update_winner_prize' as any, { p_winner_id: winner.id, p_prize_text: text || null });
    setSaving(false);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Prize updated' });
    onUpdated();
  };

  const icon = winner.rank === 1 ? '🥇' : winner.rank === 2 ? '🥈' : '🥉';

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="text-2xl">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate">{winner.full_name || 'Unknown'}</p>
        <p className="text-xs text-muted-foreground">Score: {winner.score}</p>
      </div>
      <Input
        placeholder="Prize (e.g. ₹500 cash)"
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="max-w-xs"
      />
      <Button size="sm" onClick={save} disabled={saving}>
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
      </Button>
    </div>
  );
}
