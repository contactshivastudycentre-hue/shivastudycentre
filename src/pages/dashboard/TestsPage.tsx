import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ClipboardList, Clock, ArrowRight, CheckCircle, Eye, Lock, Calendar, Radio } from 'lucide-react';
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
  const { user } = useAuth();

  useEffect(() => {
    fetchTests();
    fetchAttempts();
  }, []);

  const fetchTests = async () => {
    const { data } = await supabase
      .from('tests')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (data) {
      setTests(data);
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
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Tests</h1>
          <p className="text-muted-foreground">Attempt MCQ tests and track your progress</p>
        </div>
        <CardSkeletonGrid count={3} variant="test" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Tests</h1>
        <p className="text-muted-foreground">Attempt MCQ tests and track your progress</p>
      </div>

      {activeAttempt && (
        <div className="dashboard-card border-l-4 border-l-warning bg-warning/5 flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-warning mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-foreground text-sm">A test is in progress</p>
              <p className="text-xs text-muted-foreground">Finish or submit it before starting another test.</p>
            </div>
          </div>
          <Link to={`/dashboard/tests/${activeAttempt.test_id}`}>
            <Button size="sm">Resume</Button>
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

            return (
              <div key={test.id} className="dashboard-card">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-accent text-accent-foreground">
                        {test.subject}
                      </span>
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
                        {test.class}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-1">{test.title}</h3>
                    {test.description && (
                      <p className="text-sm text-muted-foreground mb-3">{test.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {test.duration_minutes} minutes
                      </span>
                      {isCompleted && (
                        <span className="flex items-center gap-1 text-success">
                          <CheckCircle className="w-4 h-4" />
                          {attempt?.evaluation_status === 'pending' 
                            ? `MCQ: ${attempt.mcq_score || 0} marks (Review pending)`
                            : `Score: ${attempt?.score || 0}%`
                          }
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    {isCompleted ? (
                      <Link to={`/dashboard/results/${attempt?.id}`}>
                        <Button variant="outline" className="gap-2">
                          <Eye className="w-4 h-4" />
                          View Result
                        </Button>
                      </Link>
                    ) : activeAttempt && activeAttempt.test_id !== test.id ? (
                      <Button variant="outline" disabled className="gap-2 opacity-60">
                        <Lock className="w-4 h-4" />
                        Locked
                      </Button>
                    ) : (
                      <Link to={`/dashboard/tests/${test.id}`}>
                        <Button>
                          {attempt ? 'Continue' : 'Start Test'}
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
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
