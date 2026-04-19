import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ClipboardList, Clock, ArrowRight, CheckCircle, Eye, Lock, Calendar, Radio, Trophy } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { CardSkeletonGrid } from '@/components/skeletons/CardSkeleton';

interface Test {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  subject: string;
  class: string;
  start_time?: string | null;
  end_time?: string | null;
  banner_image?: string | null;
  prize_pool?: number | null;
  prize_type?: string | null;
  prize_value?: string | null;
}

function testPrize(t: Test): string | null {
  if (t.prize_value) return t.prize_value;
  if (t.prize_pool) return `₹${t.prize_pool}`;
  return null;
}

type TestPhase = 'upcoming' | 'live' | 'closed' | 'always';

function getPhase(t: Test, now: Date): TestPhase {
  if (!t.start_time || !t.end_time) return 'always';
  const s = new Date(t.start_time);
  const e = new Date(t.end_time);
  if (now < s) return 'upcoming';
  if (now > e) return 'closed';
  return 'live';
}

function formatCountdown(target: Date, now: Date): string {
  const ms = target.getTime() - now.getTime();
  if (ms <= 0) return '0s';
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

interface TestAttempt {
  id: string;
  test_id: string;
  score: number | null;
  mcq_score: number | null;
  submitted_at: string | null;
  evaluation_status: string | null;
}

export default function TestsPage() {
  const [tests, setTests] = useState<Test[]>([]);
  const [attempts, setAttempts] = useState<TestAttempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const { user } = useAuth();

  useEffect(() => {
    fetchTests();
    fetchAttempts();
  }, []);

  // Tick every second to keep countdowns live
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const fetchTests = async () => {
    const { data } = await supabase
      .from('tests')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (data) {
      setTests(data as Test[]);
    }
    setIsLoading(false);
  };

  const fetchAttempts = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('test_attempts')
      .select('id, test_id, score, mcq_score, submitted_at, evaluation_status')
      .eq('user_id', user.id);

    if (data) {
      setAttempts(data);
    }
  };

  const getAttempt = (testId: string) => {
    return attempts.find((a) => a.test_id === testId);
  };

  // Active (unsubmitted) attempt for ANY test — used for hard session lock UI
  const activeAttempt = attempts.find((a) => !a.submitted_at);

  if (isLoading) {
    return (
      <div className="page-shell space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Tests</h1>
          <p className="text-muted-foreground">Attempt MCQ tests and track your progress</p>
        </div>
        <CardSkeletonGrid count={3} variant="test" />
      </div>
    );
  }

  return (
    <div className="page-shell space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Tests</h1>
        <p className="text-muted-foreground">Attempt MCQ tests and track your progress</p>
      </div>

      {activeAttempt && (
        <div className="dashboard-card border-l-4 border-l-warning bg-warning/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 sm:p-6">
          <div className="flex items-start gap-3 min-w-0">
            <Lock className="w-5 h-5 text-warning mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="font-semibold text-foreground text-sm">A test is in progress</p>
              <p className="text-xs text-muted-foreground">Finish or submit it before starting another test.</p>
            </div>
          </div>
          <Link to={`/dashboard/tests/${activeAttempt.test_id}`} className="w-full sm:w-auto">
            <Button size="sm" className="w-full sm:w-auto">Resume</Button>
          </Link>
        </div>
      )}

{tests.length === 0 ? (
        <div className="dashboard-card text-center py-12">
          <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Tests Available</h3>
          <p className="text-muted-foreground">Tests will appear here once published by admin.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {tests.map((test) => {
            const attempt = getAttempt(test.id);
            const isCompleted = attempt?.submitted_at;
            const phase = getPhase(test, now);
            const phaseBadge = phase === 'upcoming'
              ? <span className="text-xs font-bold px-2 py-1 rounded-full bg-primary/10 text-primary inline-flex items-center gap-1"><Calendar className="w-3 h-3" />UPCOMING · {test.start_time && formatCountdown(new Date(test.start_time), now)}</span>
              : phase === 'live'
              ? <span className="text-xs font-bold px-2 py-1 rounded-full bg-success/15 text-success inline-flex items-center gap-1 animate-pulse"><Radio className="w-3 h-3" />LIVE · ends in {test.end_time && formatCountdown(new Date(test.end_time), now)}</span>
              : phase === 'closed'
              ? <span className="text-xs font-bold px-2 py-1 rounded-full bg-muted text-muted-foreground">TEST CLOSED</span>
              : null;

            return (
              <div key={test.id} className="dashboard-card p-4 sm:p-6">
                {test.banner_image && (
                  <img src={test.banner_image} alt="" className="w-full h-28 sm:h-32 object-cover rounded-xl mb-3" loading="lazy" />
                )}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-accent text-accent-foreground">{test.subject}</span>
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-secondary text-secondary-foreground">Class {test.class}</span>
                      {phaseBadge}
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold text-foreground mb-1 break-words">{test.title}</h3>
                    {test.description && <p className="text-sm text-muted-foreground mb-3 break-words">{test.description}</p>}
                    <div className="flex items-center gap-3 text-xs sm:text-sm text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1"><Clock className="w-4 h-4 shrink-0" />{test.duration_minutes} minutes</span>
                      {testPrize(test) ? (
                        <span className="flex items-center gap-1 font-semibold text-amber-600 break-words"><Trophy className="w-4 h-4 shrink-0" />Prize: {testPrize(test)}</span>
                      ) : null}
                      {test.start_time && phase !== 'always' && (
                        <span className="flex items-center gap-1 break-words"><Calendar className="w-4 h-4 shrink-0" />{new Date(test.start_time).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}</span>
                      )}
                      {isCompleted && (
                        <span className="flex items-center gap-1 text-success">
                          <CheckCircle className="w-4 h-4" />
                          {attempt?.evaluation_status === 'pending'
                            ? `MCQ: ${attempt.mcq_score || 0} marks (Review pending)`
                            : `Score: ${attempt?.score || 0}%`}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mobile-action-row sm:justify-end sm:w-auto shrink-0">
                    {isCompleted ? (
                      <Link to={`/dashboard/results/${attempt?.id}`} className="w-full sm:w-auto">
                        <Button size="sm" variant="outline" className="touch-manipulation h-10 w-full sm:w-auto px-3 text-xs sm:text-sm gap-1.5"><Eye className="w-3.5 h-3.5" />View Result</Button>
                      </Link>
                    ) : phase === 'upcoming' ? (
                      <Button size="sm" variant="outline" disabled className="touch-manipulation h-10 w-full sm:w-auto px-3 text-xs sm:text-sm gap-1.5 opacity-60"><Calendar className="w-3.5 h-3.5" />Upcoming</Button>
                    ) : phase === 'closed' ? (
                      <Button size="sm" variant="outline" disabled className="touch-manipulation h-10 w-full sm:w-auto px-3 text-xs sm:text-sm gap-1.5 opacity-60"><Lock className="w-3.5 h-3.5" />Closed</Button>
                    ) : activeAttempt && activeAttempt.test_id !== test.id ? (
                      <Button size="sm" variant="outline" disabled className="touch-manipulation h-10 w-full sm:w-auto px-3 text-xs sm:text-sm gap-1.5 opacity-60"><Lock className="w-3.5 h-3.5" />Locked</Button>
                    ) : (
                      <Link to={`/dashboard/tests/${test.id}`} className="w-full sm:w-auto">
                        <Button size="sm" className="touch-manipulation h-10 w-full sm:w-auto px-3 text-xs sm:text-sm gap-1">{attempt ? 'Continue' : 'Start Test'}<ArrowRight className="w-3.5 h-3.5" /></Button>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
