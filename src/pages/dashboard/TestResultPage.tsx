import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Target,
  Award,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  FileText
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import ChallengeFriendButton from '@/components/ChallengeFriendButton';
import { Trophy, Gift } from 'lucide-react';

interface WinnerRow {
  id: string;
  user_id: string;
  full_name: string | null;
  rank: number | null;
  score: number | null;
  prize_text: string | null;
  category: string;
}

type QuestionType = 'mcq_single' | 'mcq_multiple' | 'true_false' | 'short_answer' | 'long_answer';

interface Question {
  id: string;
  question_text: string;
  question_type: QuestionType;
  options: string[];
  correct_answers: number[];
  marks: number;
}

interface Answer {
  selected?: number[];
  text?: string;
}

interface TestAttempt {
  id: string;
  answers: Record<string, Answer>;
  score: number | null;
  mcq_score: number | null;
  submitted_at: string;
  started_at: string;
  evaluation_status: string | null;
}

interface Test {
  id: string;
  title: string;
  subject: string;
  class: string;
  duration_minutes: number;
  total_marks: number;
}

export default function TestResultPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attempt, setAttempt] = useState<TestAttempt | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const [winners, setWinners] = useState<WinnerRow[]>([]);

  useEffect(() => {
    if (attemptId && user) {
      fetchResultData();
    }
  }, [attemptId, user]);

  const fetchResultData = async () => {
    try {
      // Fetch attempt with test info
      const { data: attemptData, error: attemptError } = await supabase
        .from('test_attempts')
        .select('*')
        .eq('id', attemptId)
        .eq('user_id', user?.id)
        .maybeSingle();

      if (attemptError || !attemptData) {
        console.error('Failed to fetch attempt:', attemptError);
        navigate('/dashboard/tests');
        return;
      }

      // Must be submitted to view results
      if (!attemptData.submitted_at) {
        navigate(`/dashboard/tests/${attemptData.test_id}`);
        return;
      }

      setAttempt({
        id: attemptData.id,
        answers: (attemptData.answers as Record<string, Answer>) || {},
        score: attemptData.score,
        mcq_score: attemptData.mcq_score,
        submitted_at: attemptData.submitted_at,
        started_at: attemptData.started_at,
        evaluation_status: attemptData.evaluation_status,
      });

      // Fetch test details
      const { data: testData } = await supabase
        .from('tests')
        .select('id, title, subject, class, duration_minutes, total_marks')
        .eq('id', attemptData.test_id)
        .maybeSingle();

      if (testData) {
        setTest(testData);
      }

      // Fetch questions
      const { data: questionsData } = await supabase
        .from('questions')
        .select('*')
        .eq('test_id', attemptData.test_id)
        .order('created_at', { ascending: true });

      if (questionsData) {
        const parsedQuestions = questionsData.map((q) => ({
          id: q.id,
          question_text: q.question_text,
          question_type: (q.question_type as QuestionType) || 'mcq_single',
          options: (q.options as string[]) || [],
          correct_answers: (q.correct_answers as number[]) || [],
          marks: q.marks || 1,
        }));
        setQuestions(parsedQuestions);
        // Expand all by default for easy viewing
        setExpandedQuestions(new Set(parsedQuestions.map((q) => q.id)));
      }
      // Fetch winners (top + lucky) — RLS allows when results_published_at is set
      const { data: winnersData } = await supabase
        .from('test_winners')
        .select('id, user_id, full_name, rank, score, prize_text, category')
        .eq('test_id', attemptData.test_id)
        .order('category', { ascending: true })
        .order('rank', { ascending: true, nullsFirst: false });
      if (winnersData) setWinners(winnersData as WinnerRow[]);
    } catch (error) {
      console.error('Error fetching result:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleQuestion = (id: string) => {
    setExpandedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getQuestionResult = (question: Question) => {
    const answer = attempt?.answers[question.id];
    
    if (['mcq_single', 'mcq_multiple', 'true_false'].includes(question.question_type)) {
      const selected = answer?.selected || [];
      const correct = question.correct_answers;
      
      if (selected.length === 0) {
        return { status: 'unanswered', marksObtained: 0 };
      }
      
      if (question.question_type === 'mcq_multiple') {
        const isCorrect = selected.length === correct.length && 
          selected.every((s) => correct.includes(s)) &&
          correct.every((c) => selected.includes(c));
        return { 
          status: isCorrect ? 'correct' : 'wrong', 
          marksObtained: isCorrect ? question.marks : 0 
        };
      } else {
        const isCorrect = selected.length === 1 && correct.includes(selected[0]);
        return { 
          status: isCorrect ? 'correct' : 'wrong', 
          marksObtained: isCorrect ? question.marks : 0 
        };
      }
    } else {
      // Descriptive questions
      const hasAnswer = answer?.text && answer.text.trim().length > 0;
      const isPending = attempt?.evaluation_status === 'pending';
      
      return { 
        status: hasAnswer ? (isPending ? 'pending' : 'checked') : 'unanswered',
        marksObtained: isPending ? null : 0 // Admin sets this
      };
    }
  };

  const getStats = () => {
    let correctCount = 0;
    let wrongCount = 0;
    let unansweredCount = 0;
    let pendingCount = 0;

    questions.forEach((q) => {
      const result = getQuestionResult(q);
      if (result.status === 'correct') correctCount++;
      else if (result.status === 'wrong') wrongCount++;
      else if (result.status === 'pending') pendingCount++;
      else unansweredCount++;
    });

    return { correctCount, wrongCount, unansweredCount, pendingCount };
  };

  const getTimeTaken = () => {
    if (!attempt?.started_at || !attempt?.submitted_at) return 'N/A';
    
    const start = new Date(attempt.started_at).getTime();
    const end = new Date(attempt.submitted_at).getTime();
    const diffMs = end - start;
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffSeconds = Math.floor((diffMs % 60000) / 1000);
    
    return `${diffMinutes}m ${diffSeconds}s`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-muted-foreground">Loading results...</div>
      </div>
    );
  }

  if (!attempt || !test) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">Result not found</p>
        <Button onClick={() => navigate('/dashboard/tests')}>Back to Tests</Button>
      </div>
    );
  }

  const stats = getStats();
  const isPending = attempt.evaluation_status === 'pending';

  return (
    <div className="max-w-3xl mx-auto animate-fade-in pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/tests')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-display font-bold text-foreground">{test.title}</h1>
          <p className="text-sm text-muted-foreground">{test.subject} • {test.class}</p>
        </div>
      </div>

      {/* Result Summary Card */}
      <div className="dashboard-card mb-6">
        <div className="text-center py-4">
          {isPending ? (
            <>
              <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-warning" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-1">Result Pending</h2>
              <p className="text-muted-foreground text-sm mb-4">
                Your descriptive answers are awaiting teacher review
              </p>
              <div className="inline-flex items-center gap-2 bg-accent/50 rounded-lg px-4 py-2">
                <span className="text-sm text-muted-foreground">MCQ Score:</span>
                <span className="font-bold text-foreground">{attempt.mcq_score || 0} marks</span>
              </div>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                <Award className="w-8 h-8 text-success" />
              </div>
              <div className="text-5xl font-display font-bold text-primary mb-1">
                {attempt.score || 0}%
              </div>
              <p className="text-muted-foreground">
                {attempt.mcq_score || 0} / {test.total_marks} marks
              </p>
            </>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t">
          <div className="text-center p-3 rounded-lg bg-success/5">
            <div className="flex items-center justify-center gap-1 text-success mb-1">
              <CheckCircle className="w-4 h-4" />
              <span className="font-bold">{stats.correctCount}</span>
            </div>
            <p className="text-xs text-muted-foreground">Correct</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-destructive/5">
            <div className="flex items-center justify-center gap-1 text-destructive mb-1">
              <XCircle className="w-4 h-4" />
              <span className="font-bold">{stats.wrongCount}</span>
            </div>
            <p className="text-xs text-muted-foreground">Wrong</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <AlertCircle className="w-4 h-4" />
              <span className="font-bold">{stats.unansweredCount}</span>
            </div>
            <p className="text-xs text-muted-foreground">Skipped</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-accent">
            <div className="flex items-center justify-center gap-1 text-foreground mb-1">
              <Clock className="w-4 h-4" />
              <span className="font-bold text-sm">{getTimeTaken()}</span>
            </div>
            <p className="text-xs text-muted-foreground">Time Taken</p>
          </div>
        </div>

        {stats.pendingCount > 0 && (
          <div className="mt-4 p-3 bg-warning/10 rounded-lg flex items-start gap-2">
            <FileText className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
            <p className="text-sm text-warning">
              {stats.pendingCount} descriptive question{stats.pendingCount !== 1 ? 's' : ''} pending review
            </p>
          </div>
        )}
      </div>

      {/* Question-by-Question Analysis */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          Question Analysis
        </h3>

        {questions.map((question, index) => {
          const result = getQuestionResult(question);
          const answer = attempt.answers[question.id];
          const isExpanded = expandedQuestions.has(question.id);
          const isMCQ = ['mcq_single', 'mcq_multiple', 'true_false'].includes(question.question_type);

          return (
            <div 
              key={question.id}
              className={`border rounded-xl overflow-hidden transition-colors ${
                result.status === 'correct' ? 'border-success/30 bg-success/5' :
                result.status === 'wrong' ? 'border-destructive/30 bg-destructive/5' :
                result.status === 'pending' ? 'border-warning/30 bg-warning/5' :
                'border-border bg-card'
              }`}
            >
              {/* Question Header */}
              <button
                onClick={() => toggleQuestion(question.id)}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-accent/30 transition-colors"
              >
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 ${
                  result.status === 'correct' ? 'bg-success/20 text-success' :
                  result.status === 'wrong' ? 'bg-destructive/20 text-destructive' :
                  result.status === 'pending' ? 'bg-warning/20 text-warning' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate text-sm">
                    {question.question_text}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={
                      result.status === 'correct' ? 'default' :
                      result.status === 'wrong' ? 'destructive' :
                      result.status === 'pending' ? 'secondary' :
                      'outline'
                    } className="text-xs">
                      {result.status === 'correct' && '✓ Correct'}
                      {result.status === 'wrong' && '✗ Wrong'}
                      {result.status === 'pending' && '⏳ Pending Review'}
                      {result.status === 'unanswered' && '— Skipped'}
                      {result.status === 'checked' && '✓ Checked'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {result.marksObtained !== null ? `${result.marksObtained}/${question.marks}` : `—/${question.marks}`} marks
                    </span>
                  </div>
                </div>
                {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-0 space-y-4 border-t">
                  {/* Full Question Text */}
                  <div className="pt-4">
                    <p className="text-sm font-medium text-foreground leading-relaxed">
                      {question.question_text}
                    </p>
                  </div>

                  {/* MCQ Options with Answers */}
                  {isMCQ && (
                    <div className="space-y-2">
                      {question.options.map((option, optIndex) => {
                        const isSelected = answer?.selected?.includes(optIndex) || false;
                        const isCorrect = question.correct_answers.includes(optIndex);
                        
                        let optionStyle = 'bg-secondary/30';
                        if (isCorrect) {
                          optionStyle = 'bg-success/20 border-success/40';
                        }
                        if (isSelected && !isCorrect) {
                          optionStyle = 'bg-destructive/20 border-destructive/40';
                        }

                        return (
                          <div 
                            key={optIndex}
                            className={`flex items-start gap-3 p-3 rounded-lg border ${optionStyle}`}
                          >
                            <span className="text-xs font-medium text-muted-foreground w-5">
                              {String.fromCharCode(65 + optIndex)}.
                            </span>
                            <span className="flex-1 text-sm">{option}</span>
                            <div className="flex items-center gap-1">
                              {isCorrect && (
                                <CheckCircle className="w-4 h-4 text-success" />
                              )}
                              {isSelected && !isCorrect && (
                                <XCircle className="w-4 h-4 text-destructive" />
                              )}
                              {isSelected && (
                                <span className="text-xs text-muted-foreground">(Your answer)</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Descriptive Answer */}
                  {!isMCQ && (
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">Your Answer:</p>
                        <div className="bg-background p-3 rounded-lg border text-sm">
                          {answer?.text || <span className="text-muted-foreground italic">No answer provided</span>}
                        </div>
                      </div>
                      {result.status === 'pending' && (
                        <div className="flex items-center gap-2 p-2 bg-warning/10 rounded-lg">
                          <Clock className="w-4 h-4 text-warning" />
                          <span className="text-xs text-warning">Awaiting teacher evaluation</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Challenge a Friend */}
      {!isPending && (
        <div className="mt-8">
          <ChallengeFriendButton
            testId={test.id}
            attemptId={attempt.id}
            score={attempt.mcq_score ?? attempt.score}
            totalMarks={test.total_marks}
            testTitle={test.title}
          />
        </div>
      )}

      {/* Back Button */}
      <div className="mt-6 text-center">
        <Button onClick={() => navigate('/dashboard/tests')} size="lg" variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Tests
        </Button>
      </div>
    </div>
  );
}
