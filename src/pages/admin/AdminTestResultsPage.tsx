import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Trophy, Crown, Medal, Award, EyeOff, Loader2, Ban, RefreshCw, Clock, Sparkles, Dice5, Gift, Rocket, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

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

interface EnrichedRow {
  id: string;
  user_id: string;
  full_name: string;
  class: string;
  time_taken: number;
  effective_score: number;
  is_banned: boolean;
  rank: number;
}

interface ExistingWinner {
  id: string;
  rank: number | null;
  user_id: string;
  full_name: string | null;
  score: number | null;
  prize_text: string | null;
  category: string;
}

interface PickedTopWinner {
  user_id: string;
  prize_text: string;
}

interface PickedLuckyWinner {
  user_id: string;
  prize_text: string;
}

const fmtTime = (s: number) => `${Math.floor(s / 60)}m ${s % 60}s`;

export default function AdminTestResultsPage() {
  const { testId } = useParams<{ testId: string }>();
  const qc = useQueryClient();

  const { data: test, isLoading: testLoading } = useQuery({
    queryKey: ['admin-test', testId],
    queryFn: async () => {
      const { data } = await supabase.from('tests').select('*').eq('id', testId!).maybeSingle();
      return data as any;
    },
    enabled: !!testId,
  });

  const { data: leaderboard, isLoading: lbLoading } = useQuery({
    queryKey: ['admin-test-leaderboard', testId],
    queryFn: async (): Promise<EnrichedRow[]> => {
      const { data: attempts } = await supabase
        .from('test_attempts')
        .select('id, user_id, score, mcq_score, started_at, submitted_at, is_banned')
        .eq('test_id', testId!)
        .not('submitted_at', 'is', null);

      if (!attempts?.length) return [];
      const userIds = [...new Set((attempts as AttemptRow[]).map((a) => a.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, class, mobile')
        .in('user_id', userIds);

      const profileMap = new Map<string, ProfileRow>();
      (profiles || []).forEach((p) => profileMap.set(p.user_id, p as ProfileRow));

      const rows = (attempts as AttemptRow[])
        .filter((a) => {
          const p = profileMap.get(a.user_id);
          return p && p.mobile !== '0000000000' && (p.full_name || '').toLowerCase() !== 'admin';
        })
        .map((a) => {
          const p = profileMap.get(a.user_id);
          const t = a.submitted_at && a.started_at
            ? Math.round((new Date(a.submitted_at).getTime() - new Date(a.started_at).getTime()) / 1000)
            : 0;
          return {
            id: a.id,
            user_id: a.user_id,
            full_name: p?.full_name || 'Unknown',
            class: p?.class || '',
            time_taken: t,
            effective_score: a.score ?? a.mcq_score ?? 0,
            is_banned: a.is_banned,
            rank: 0,
          };
        })
        .sort((a, b) => b.effective_score - a.effective_score || a.time_taken - b.time_taken);

      let rank = 0;
      return rows.map((r) => ({ ...r, rank: r.is_banned ? -1 : ++rank }));
    },
    enabled: !!testId,
  });

  const { data: winners } = useQuery({
    queryKey: ['admin-test-winners', testId],
    queryFn: async () => {
      const { data } = await supabase
        .from('test_winners' as any)
        .select('id, rank, user_id, full_name, score, prize_text, category')
        .eq('test_id', testId!)
        .order('rank', { ascending: true, nullsFirst: false });
      return ((data as any) || []) as ExistingWinner[];
    },
    enabled: !!testId && !!test?.results_published_at,
  });

  // Eligible (active) submissions for picker
  const eligible = useMemo(() => (leaderboard || []).filter((r) => !r.is_banned), [leaderboard]);
  const banned = useMemo(() => (leaderboard || []).filter((r) => r.is_banned), [leaderboard]);

  // Local picker state
  const [topPicks, setTopPicks] = useState<PickedTopWinner[]>([
    { user_id: '', prize_text: '' },
    { user_id: '', prize_text: '' },
    { user_id: '', prize_text: '' },
  ]);
  const [luckyCount, setLuckyCount] = useState<number>(0);
  const [luckyPrize, setLuckyPrize] = useState<string>('');
  const [luckyPicks, setLuckyPicks] = useState<PickedLuckyWinner[]>([]);

  // Hydrate top picks from leaderboard or saved winners
  useEffect(() => {
    if (winners && winners.length > 0) {
      const tops = winners.filter((w) => w.category === 'top').sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
      const luckys = winners.filter((w) => w.category === 'lucky');
      setTopPicks([0, 1, 2].map((i) => ({
        user_id: tops[i]?.user_id || eligible[i]?.user_id || '',
        prize_text: tops[i]?.prize_text || '',
      })));
      setLuckyPicks(luckys.map((w) => ({ user_id: w.user_id, prize_text: w.prize_text || '' })));
      setLuckyCount(luckys.length);
      if (luckys[0]?.prize_text) setLuckyPrize(luckys[0].prize_text);
    } else if (eligible.length) {
      setTopPicks([0, 1, 2].map((i) => ({ user_id: eligible[i]?.user_id || '', prize_text: '' })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winners, leaderboard]);

  const studentName = (uid: string) => eligible.find((e) => e.user_id === uid)?.full_name || '—';
  const studentScore = (uid: string) => eligible.find((e) => e.user_id === uid)?.effective_score ?? 0;

  const setTopPick = (idx: number, patch: Partial<PickedTopWinner>) => {
    setTopPicks((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  };

  const autoPickLucky = () => {
    if (!luckyPrize.trim()) {
      toast({ title: 'Prize required', description: 'Set a default prize for lucky winners before picking.', variant: 'destructive' });
      return;
    }
    // Always exclude Top 1/2/3 picks from lucky winner pool
    const excluded = new Set(topPicks.map((t) => t.user_id).filter(Boolean));
    const pool = eligible.filter((e) => !excluded.has(e.user_id));
    if (luckyCount > pool.length) {
      toast({ title: 'Not enough students', description: `Only ${pool.length} students available after excluding Top 1/2/3.`, variant: 'destructive' });
      return;
    }
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const picks = shuffled.slice(0, luckyCount).map((e) => ({ user_id: e.user_id, prize_text: luckyPrize.trim() }));
    setLuckyPicks(picks);
    toast({ title: '🎲 Lucky winners picked', description: `${picks.length} random winner${picks.length !== 1 ? 's' : ''} selected (Top 3 excluded).` });
  };

  const rerollLucky = (idx: number) => {
    // Always exclude Top 1/2/3 + currently picked lucky winners
    const excluded = new Set([
      ...topPicks.map((t) => t.user_id).filter(Boolean),
      ...luckyPicks.map((p) => p.user_id),
    ]);
    const pool = eligible.filter((e) => !excluded.has(e.user_id));
    if (!pool.length) {
      toast({ title: 'No more candidates', variant: 'destructive' });
      return;
    }
    const replacement = pool[Math.floor(Math.random() * pool.length)];
    setLuckyPicks((prev) => prev.map((p, i) => (i === idx ? { user_id: replacement.user_id, prize_text: p.prize_text } : p)));
  };

  const removeLucky = (idx: number) => setLuckyPicks((prev) => prev.filter((_, i) => i !== idx));

  const publishMutation = useMutation({
    mutationFn: async () => {
      const payload: Array<Record<string, unknown>> = [];
      const ALLOWED_CATEGORIES = ['top', 'lucky'] as const;

      // Validate Top winners — prize_text required for any picked top winner
      for (let i = 0; i < topPicks.length; i++) {
        const t = topPicks[i];
        if (!t.user_id) continue;
        const prize = (t.prize_text || '').trim();
        if (!prize) {
          throw new Error(`Top ${i + 1} winner needs a prize. Please fill in the prize field.`);
        }
        const cat: typeof ALLOWED_CATEGORIES[number] = 'top';
        if (!ALLOWED_CATEGORIES.includes(cat)) throw new Error('Invalid category');
        payload.push({
          user_id: t.user_id,
          full_name: studentName(t.user_id),
          score: studentScore(t.user_id),
          rank: i + 1,
          prize_text: prize,
          category: cat,
        });
      }

      // Block duplicate user_ids across Top picks
      const topIds = payload.filter(p => p.category === 'top').map(p => p.user_id);
      if (new Set(topIds).size !== topIds.length) {
        throw new Error('A student is selected in more than one Top slot. Please pick distinct winners.');
      }

      // Validate Lucky winners — exclude Top 3 and require prize per row
      const topUserIds = new Set(topIds as string[]);
      for (const l of luckyPicks) {
        if (!l.user_id) continue;
        if (topUserIds.has(l.user_id)) {
          throw new Error('A lucky winner is also in Top 1/2/3. Remove the duplicate before publishing.');
        }
        const prize = (l.prize_text || luckyPrize || '').trim();
        if (!prize) {
          throw new Error('Every lucky winner needs a prize. Set a default prize or fill each row.');
        }
        const cat: typeof ALLOWED_CATEGORIES[number] = 'lucky';
        if (!ALLOWED_CATEGORIES.includes(cat)) throw new Error('Invalid category');
        payload.push({
          user_id: l.user_id,
          full_name: studentName(l.user_id),
          score: studentScore(l.user_id),
          rank: null,
          prize_text: prize,
          category: cat,
        });
      }

      if (!payload.length) throw new Error('Pick at least one winner before publishing.');

      const { error } = await supabase.rpc('publish_test_winners' as any, {
        p_test_id: testId!,
        p_winners: payload as any,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-test', testId] });
      qc.invalidateQueries({ queryKey: ['admin-test-winners', testId] });
      toast({ title: '🎉 Results published', description: 'Winners are now live for students.' });
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
  const audience = test.class_group === 'junior' ? 'Junior (6–7)'
    : test.class_group === 'senior' ? 'Senior (8–10)'
    : test.class_group === 'custom' ? 'Custom'
    : `Class ${test.class}`;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex items-center gap-3 flex-wrap">
        <Link to="/admin/tests"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-display font-bold text-foreground truncate">{test.title}</h1>
          <p className="text-sm text-muted-foreground">{audience} • {test.subject} • {test.test_type === 'sunday_special' ? '🔥 SSC Special Test' : test.test_type}</p>
        </div>
        {isPublished && (
          <Button variant="outline" className="gap-2 text-amber-700 border-amber-300" onClick={() => unpublishMutation.mutate()} disabled={unpublishMutation.isPending}>
            {unpublishMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <EyeOff className="w-4 h-4" />}
            Unpublish
          </Button>
        )}
      </div>

      {!isPublished ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>Draft:</strong> Pick your Top 1/2/3 and any lucky winners below, then click <strong>Publish Results & Winners</strong>.
        </div>
      ) : (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 flex items-center gap-2">
          <Clock className="w-4 h-4" /> Highlighted on dashboards for <strong>24 hours</strong> from publish • Always visible on the Leaderboard page after that.
        </div>
      )}

      {/* A. Manual Top winners */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" /> Top Winners
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[0, 1, 2].map((i) => {
            const rankIcon = i === 0 ? <Crown className="w-5 h-5 text-yellow-500" /> : i === 1 ? <Medal className="w-5 h-5 text-gray-400" /> : <Award className="w-5 h-5 text-amber-600" />;
            const label = ['Top 1', 'Top 2', 'Top 3'][i];
            return (
              <div key={i} className="grid grid-cols-1 md:grid-cols-[auto_1fr_1fr] gap-3 items-center rounded-xl border border-border p-3">
                <div className="flex items-center gap-2">
                  {rankIcon}
                  <span className="font-semibold text-sm">{label}</span>
                </div>
                <Select value={topPicks[i]?.user_id || ''} onValueChange={(v) => setTopPick(i, { user_id: v })}>
                  <SelectTrigger><SelectValue placeholder={eligible.length ? 'Pick a student' : 'No submissions yet'} /></SelectTrigger>
                  <SelectContent>
                    {eligible.map((e) => (
                      <SelectItem key={e.user_id} value={e.user_id}>
                        #{e.rank} • {e.full_name} • {e.effective_score} pts • {fmtTime(e.time_taken)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Prize (e.g. ₹500 / Bag)"
                  value={topPicks[i]?.prize_text || ''}
                  onChange={(e) => setTopPick(i, { prize_text: e.target.value })}
                />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* B. Lucky winners */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" /> Lucky Winners
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">How many?</Label>
              <Input type="number" min={0} max={20} value={luckyCount} onChange={(e) => setLuckyCount(Math.max(0, Math.min(20, parseInt(e.target.value) || 0)))} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">Default prize for all lucky winners</Label>
              <Input placeholder="e.g. Certificate / ₹100" value={luckyPrize} onChange={(e) => setLuckyPrize(e.target.value)} />
            </div>
          </div>
          <Button
            type="button"
            onClick={autoPickLucky}
            disabled={luckyCount === 0 || eligible.length === 0}
            className="gap-2 bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Dice5 className="w-4 h-4" /> Auto-pick {luckyCount || ''} lucky winner{luckyCount !== 1 ? 's' : ''}
          </Button>

          <AnimatePresence>
            {luckyPicks.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
                {luckyPicks.map((lp, idx) => (
                  <div key={`${lp.user_id}-${idx}`} className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-2 bg-muted/30">
                    <Gift className="w-4 h-4 text-purple-500" />
                    <span className="font-medium text-sm flex-1 min-w-[120px] truncate">{studentName(lp.user_id)}</span>
                    <Input
                      className="h-8 max-w-[180px] text-xs"
                      value={lp.prize_text}
                      onChange={(e) => setLuckyPicks((prev) => prev.map((p, i) => (i === idx ? { ...p, prize_text: e.target.value } : p)))}
                      placeholder="Prize"
                    />
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => rerollLucky(idx)} title="Re-roll"><RefreshCw className="w-3.5 h-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeLucky(idx)} title="Remove"><X className="w-3.5 h-3.5" /></Button>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* C. Publish */}
      <div className="flex justify-end">
        <Button
          size="lg"
          className="gap-2 bg-emerald-600 hover:bg-emerald-700"
          onClick={() => publishMutation.mutate()}
          disabled={publishMutation.isPending || eligible.length === 0}
        >
          {publishMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
          {isPublished ? 'Re-publish Results & Winners' : 'Publish Results & Winners'}
        </Button>
      </div>

      {/* D. Submissions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Submissions ({eligible.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {lbLoading ? (
            <p className="p-6 text-center text-muted-foreground">Loading…</p>
          ) : !eligible.length && !banned.length ? (
            <p className="p-6 text-center text-muted-foreground">No submissions yet</p>
          ) : (
            <div className="divide-y">
              {eligible.map((row) => (
                <div key={row.id} className="flex items-center gap-3 p-3">
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
                </div>
              ))}
              {banned.map((row) => (
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
