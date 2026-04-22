import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trophy, Crown, Medal, Award, Sparkles, Gift } from 'lucide-react';
import { motion } from 'framer-motion';

const CLASSES = ['4', '5', '6', '7', '8', '9', '10', '11', '12'];
const TYPE_LABELS: Record<string, string> = {
  all: 'All Tests',
  sunday_special: 'SSC Special Test',
  standard: 'Standard',
  practice: 'Practice',
};
const GROUP_LABELS: Record<string, string> = {
  all: 'All Groups',
  junior: 'Junior (6–7)',
  senior: 'Senior (8–10)',
  single: 'Single Class',
};

interface PublishedTest {
  id: string;
  title: string;
  class: string;
  subject: string;
  test_type: string;
  class_group: string;
  results_published_at: string;
}

interface LbRow {
  rank: number;
  user_id: string;
  full_name: string;
  score: number;
  time_seconds: number;
}

interface WinnerRow {
  id: string;
  user_id: string;
  full_name: string | null;
  rank: number | null;
  score: number | null;
  prize_text: string | null;
  category: string;
}

export default function LeaderboardPage() {
  const { user, profile } = useAuth();
  const [classFilter, setClassFilter] = useState<string>(profile?.class || 'all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedTest, setSelectedTest] = useState<string>('');

  // Pull all tests with published results that this student can see (RLS handles class scope)
  const { data: tests } = useQuery({
    queryKey: ['published-result-tests'],
    queryFn: async () => {
      const { data } = await supabase
        .from('tests')
        .select('id, title, class, subject, test_type, results_published_at')
        .not('results_published_at', 'is', null)
        .order('results_published_at', { ascending: false });
      return ((data as any) || []) as PublishedTest[];
    },
  });

  const filteredTests = useMemo(() => {
    let list = tests || [];
    if (classFilter !== 'all') list = list.filter(t => t.class === classFilter);
    if (typeFilter !== 'all') list = list.filter(t => t.test_type === typeFilter);
    return list;
  }, [tests, classFilter, typeFilter]);

  useEffect(() => {
    if (filteredTests.length && !filteredTests.find(t => t.id === selectedTest)) {
      setSelectedTest(filteredTests[0].id);
    }
  }, [filteredTests, selectedTest]);

  const { data: lb } = useQuery({
    queryKey: ['student-test-leaderboard', selectedTest],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_test_leaderboard' as any, { p_test_id: selectedTest });
      return ((data as any) || []).map((r: any) => ({
        rank: Number(r.rank),
        user_id: r.user_id,
        full_name: r.full_name,
        score: r.score ?? 0,
        time_seconds: r.time_seconds ?? 0,
        isMe: r.user_id === user?.id,
      }));
    },
    enabled: !!selectedTest,
  });

  const activeTest = filteredTests.find(t => t.id === selectedTest);
  const fmt = (s: number) => `${Math.floor(s / 60)}m ${s % 60}s`;

  return (
    <div className="space-y-6 animate-fade-in pb-12 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
          <Trophy className="w-6 h-6 text-amber-500" /> Leaderboard
        </h1>
        <p className="text-muted-foreground text-sm">Browse rankings from any class and test type</p>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Select value={classFilter} onValueChange={setClassFilter}>
          <SelectTrigger><SelectValue placeholder="Class" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {CLASSES.map(c => <SelectItem key={c} value={c}>Class {c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            {Object.entries(TYPE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={selectedTest} onValueChange={setSelectedTest}>
          <SelectTrigger className="col-span-2 sm:col-span-1"><SelectValue placeholder="Pick a test" /></SelectTrigger>
          <SelectContent>
            {filteredTests.length === 0 && <div className="p-2 text-xs text-muted-foreground">No published results</div>}
            {filteredTests.map(t => (
              <SelectItem key={t.id} value={t.id}>
                {t.test_type === 'sunday_special' ? '🔥 ' : ''}{t.title} • C{t.class}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedTest ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Select a test to view rankings</CardContent></Card>
      ) : (
        <>
          {/* Test header */}
          {activeTest && (
            <div className={`rounded-2xl p-5 text-white ${
              activeTest.test_type === 'sunday_special'
                ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500'
                : 'bg-gradient-to-r from-indigo-600 to-purple-600'
            }`}>
              <div className="flex items-center gap-2 mb-1 text-[11px] font-bold uppercase tracking-widest">
                {activeTest.test_type === 'sunday_special' && <Sparkles className="w-3 h-3" />}
                {TYPE_LABELS[activeTest.test_type] || activeTest.test_type} • Class {activeTest.class}
              </div>
              <h2 className="font-display text-xl font-bold">{activeTest.title}</h2>
              <p className="text-sm opacity-90">{activeTest.subject}</p>
            </div>
          )}

          {/* Top 3 podium */}
          {lb && lb.length >= 3 && (
            <div className="grid grid-cols-3 gap-2">
              {[1, 0, 2].map(idx => {
                const e = lb[idx];
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
                    <p className={`font-display font-bold text-sm text-center mt-1 ${e.isMe ? 'text-primary' : 'text-foreground'}`}>{e.full_name}</p>
                    <p className="text-lg font-bold text-primary">{e.score}</p>
                    <p className="text-xs text-muted-foreground">{fmt(e.time_seconds)}</p>
                    <div className={`w-full h-16 sm:h-20 rounded-t-xl mt-2 border-2 ${colors[idx]} flex items-center justify-center`}>
                      <span className="font-display font-bold text-lg text-foreground">#{e.rank}</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Full rankings */}
          <Card>
            <CardHeader><CardTitle className="text-lg">Full Rankings</CardTitle></CardHeader>
            <CardContent className="p-0">
              {!lb?.length ? (
                <p className="p-6 text-center text-muted-foreground">No rankings yet</p>
              ) : (
                <div className="divide-y">
                  {lb.map((entry: any) => (
                    <motion.div
                      key={entry.user_id + entry.rank}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`flex items-center gap-3 p-3 ${entry.isMe ? 'bg-primary/5 border-l-4 border-l-primary' : ''}`}
                    >
                      <div className="w-10 flex-shrink-0">
                        {entry.rank === 1 ? <Crown className="w-6 h-6 text-yellow-500" />
                          : entry.rank === 2 ? <Medal className="w-6 h-6 text-gray-400" />
                          : entry.rank === 3 ? <Award className="w-6 h-6 text-amber-600" />
                          : <span className="text-sm font-bold text-muted-foreground">#{entry.rank}</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium truncate ${entry.isMe ? 'text-primary font-bold' : 'text-foreground'}`}>
                          {entry.full_name} {entry.isMe && '(You)'}
                        </p>
                        <p className="text-xs text-muted-foreground">{fmt(entry.time_seconds)}</p>
                      </div>
                      <Badge variant="outline" className="font-bold">{entry.score}</Badge>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
