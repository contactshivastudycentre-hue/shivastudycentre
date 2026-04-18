import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Clock, AlertCircle, CheckCircle, ArrowLeft, ArrowRight, Flag, Send, Shield, Loader2, AlertTriangle, WifiOff, RefreshCw, Eye, Wifi, Lock } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { useAntiCheat } from '@/hooks/useAntiCheat';
import { seededShuffle } from '@/lib/shuffle';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type QuestionType = 'mcq_single' | 'mcq_multiple' | 'true_false' | 'short_answer' | 'long_answer';

interface Question {
  id: string;
  question_text: string;
  question_type: QuestionType;
  options: string[];
  correct_answers: number[];
  marks: number;
}

interface Test {
  id: string;
  title: string;
  duration_minutes: number;
  total_marks: number;
  description: string | null;
}

interface Answer {
  selected?: number[];
  text?: string;
}

interface SubmitResult {
  mcqScore: number;
  totalMarks: number;
  hasDescriptive: boolean;
  percentage: number;
}

const LOCAL_STORAGE_KEY = 'test-attempt-';
const MAX_SUBMIT_WAIT_MS = 8000; // 8 seconds max wait before showing slow connection warning

export default function TestAttemptPage() {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showNavigator, setShowNavigator] = useState(false);
  const [violationCount, setViolationCount] = useState(0);
  const [hasDescriptiveQuestions, setHasDescriptiveQuestions] = useState(false);

  // Sunday Special locked-sequence state
  const [isSundaySpecial, setIsSundaySpecial] = useState(false);
  const [questionTimeLeft, setQuestionTimeLeft] = useState(60);
  const [slideDirection, setSlideDirection] = useState<'in' | 'out'>('in');

  // Per-student question shuffle (deterministic — same student sees same order
  // on refresh, different students see different orders). Seed = attemptId.
  const shuffledQuestions = attemptId
    ? seededShuffle(questions, attemptId)
    : questions;

  // Simplified submit states
  const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'slow' | 'offline' | 'failed' | 'success'>('idle');
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  // Per-answer save status + network tracking
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [wasResumed, setWasResumed] = useState(false);

  // Refs to prevent double submission
  const submitLockRef = useRef(false);
  const submitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSyncRef = useRef(false);
  const savedFlashRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Calculate MCQ score
  const calculateScore = useCallback(() => {
    let mcqScore = 0;
    let mcqTotal = 0;
    let hasDescriptive = false;

    questions.forEach((q) => {
      const answer = answers[q.id];
      
      if (['mcq_single', 'mcq_multiple', 'true_false'].includes(q.question_type)) {
        mcqTotal += q.marks;
        const selected = answer?.selected || [];
        const correct = q.correct_answers;
        
        if (q.question_type === 'mcq_multiple') {
          if (selected.length === correct.length && 
              selected.every(s => correct.includes(s)) &&
              correct.every(c => selected.includes(c))) {
            mcqScore += q.marks;
          }
        } else {
          if (selected.length === 1 && correct.includes(selected[0])) {
            mcqScore += q.marks;
          }
        }
      } else {
        hasDescriptive = true;
      }
    });

    const totalMarks = test?.total_marks || 0;
    const percentage = totalMarks > 0 ? Math.round((mcqScore / totalMarks) * 100) : 0;

    return { mcqScore, totalMarks, hasDescriptive, percentage };
  }, [answers, questions, test?.total_marks]);

  // Clean, single-request submit function
  const submitTest = useCallback(async (isAutoSubmit = false): Promise<boolean> => {
    // STEP 1: Check if already locked (prevent double submission)
    if (submitLockRef.current || alreadySubmitted) {
      console.log('Submit blocked: already in progress or submitted');
      return false;
    }

    // STEP 2: Check internet connection BEFORE attempting
    if (!navigator.onLine) {
      setSubmitState('offline');
      return false;
    }

    // STEP 3: Lock submission immediately
    submitLockRef.current = true;
    setSubmitState('submitting');
    setShowSubmitDialog(false);

    // STEP 4: Set timeout for slow connection warning (after 8s)
    submitTimeoutRef.current = setTimeout(() => {
      if (submitState === 'submitting') {
        setSubmitState('slow');
      }
    }, MAX_SUBMIT_WAIT_MS);

    const { mcqScore, totalMarks, hasDescriptive, percentage } = calculateScore();

    const updateData = {
      answers: JSON.parse(JSON.stringify(answers)),
      score: hasDescriptive ? null : percentage,
      mcq_score: mcqScore,
      submitted_at: new Date().toISOString(),
      evaluation_status: hasDescriptive ? 'pending' : 'completed',
    };

    try {
      // STEP 5: Single atomic check - is it already submitted?
      const { data: existingAttempt, error: checkError } = await supabase
        .from('test_attempts')
        .select('submitted_at')
        .eq('id', attemptId)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingAttempt?.submitted_at) {
        // Already submitted - treat as success
        clearTimeout(submitTimeoutRef.current!);
        setAlreadySubmitted(true);
        setIsCompleted(true);
        setSubmitResult({ mcqScore, totalMarks, hasDescriptive, percentage });
        setSubmitState('success');
        submitLockRef.current = false;
        
        toast({
          title: 'Test Already Submitted',
          description: 'Your test was already submitted successfully.',
        });
        return true;
      }

      // STEP 6: Call atomic backend submit RPC (handles locking + atomic save)
      const { data: rpcResult, error: rpcError } = await supabase.rpc('submit_test_attempt', {
        p_attempt_id: attemptId,
        p_answers: JSON.parse(JSON.stringify(answers)),
        p_mcq_score: mcqScore,
        p_score: hasDescriptive ? null : Math.round((mcqScore / totalMarks) * 100),
        p_has_descriptive: hasDescriptive,
      });

      if (rpcError) throw rpcError;
      const result = rpcResult as { status: string; attemptId?: string; resultStatus?: string; message?: string };
      if (!result || result.status !== 'success') {
        throw new Error(result?.message || 'Submit failed');
      }

      // STEP 7: SUCCESS - Clear everything and show results
      clearTimeout(submitTimeoutRef.current!);
      localStorage.removeItem(LOCAL_STORAGE_KEY + testId);
      
      setSubmitResult({ mcqScore, totalMarks, hasDescriptive, percentage });
      setIsCompleted(true);
      setSubmitState('success');
      submitLockRef.current = false;

      if (!isAutoSubmit) {
        toast({
          title: 'Test Submitted!',
          description: hasDescriptive 
            ? 'Your MCQ answers have been auto-graded. Descriptive answers are pending review.'
            : `You scored ${percentage}%!`,
        });
      }

      return true;
    } catch (error) {
      console.error('Submit error:', error);
      clearTimeout(submitTimeoutRef.current!);
      
      // SINGLE controlled retry (max once) before failing
      try {
        // Wait briefly and try ONE more time
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const { data: retryResult, error: retryError } = await supabase.rpc('submit_test_attempt', {
          p_attempt_id: attemptId,
          p_answers: JSON.parse(JSON.stringify(answers)),
          p_mcq_score: mcqScore,
          p_score: hasDescriptive ? null : Math.round((mcqScore / totalMarks) * 100),
          p_has_descriptive: hasDescriptive,
        });

        if (!retryError) {
          const retryRes = retryResult as { status: string };
          if (retryRes?.status === 'success') {
            // Retry succeeded
            localStorage.removeItem(LOCAL_STORAGE_KEY + testId);
            setSubmitResult({ mcqScore, totalMarks, hasDescriptive, percentage });
            setIsCompleted(true);
            setSubmitState('success');
            submitLockRef.current = false;
            return true;
          }
        }
      } catch (retryErr) {
        console.error('Retry also failed:', retryErr);
      }

      // Both attempts failed - show friendly failure message
      setSubmitState('failed');
      submitLockRef.current = false;
      return false;
    }
  }, [attemptId, answers, calculateScore, testId, toast, alreadySubmitted, submitState]);

  // Anti-cheat hook
  const { violations } = useAntiCheat({
    isActive: !!attemptId && !isCompleted && !isLoading,
    onViolation: (type) => {
      setViolationCount(prev => prev + 1);
      console.log('Violation:', type);
    },
    onForceSubmit: () => {
      toast({
        title: 'Test Auto-Submitted',
        description: 'Due to multiple violations, your test has been automatically submitted.',
        variant: 'destructive',
      });
      submitTest(true);
    },
    warningThreshold: 3,
  });

  useEffect(() => {
    if (testId) {
      fetchTestData();
    }
  }, [testId]);

  const fetchTestData = async () => {
    try {
      const { data: testData } = await supabase
        .from('tests')
        .select('id, title, duration_minutes, total_marks, description')
        .eq('id', testId)
        .maybeSingle();

      if (!testData) {
        navigate('/dashboard/tests');
        return;
      }

      setTest(testData);
      setTimeLeft(testData.duration_minutes * 60);

      // Detect if this test is linked to a Sunday Special event
      const { data: eventData } = await supabase
        .from('test_events')
        .select('event_type')
        .eq('test_id', testId)
        .eq('event_type', 'sunday_special')
        .maybeSingle();
      if (eventData?.event_type === 'sunday_special') {
        setIsSundaySpecial(true);
      }

      // Track resume-learning activity (fire and forget)
      supabase.rpc('track_activity', {
        p_content_type: 'test',
        p_content_id: testData.id,
        p_title: testData.title,
        p_subtitle: `${testData.duration_minutes} min test`,
      });

      const { data: questionsData } = await supabase
        .from('questions')
        .select('*')
        .eq('test_id', testId);

      if (questionsData) {
        const parsedQuestions = questionsData.map(q => ({
          id: q.id,
          question_text: q.question_text,
          question_type: (q.question_type as QuestionType) || 'mcq_single',
          options: (q.options as string[]) || [],
          correct_answers: (q.correct_answers as number[]) || [],
          marks: q.marks || 1,
        }));
        setQuestions(parsedQuestions);
        
        const hasDesc = parsedQuestions.some(q => 
          ['short_answer', 'long_answer'].includes(q.question_type)
        );
        setHasDescriptiveQuestions(hasDesc);
      }

      // Check for existing attempt
      const { data: existingAttempt } = await supabase
        .from('test_attempts')
        .select('*')
        .eq('test_id', testId)
        .eq('user_id', user?.id)
        .maybeSingle();

      if (existingAttempt) {
        if (existingAttempt.submitted_at) {
          // Already submitted - show results
          setIsCompleted(true);
          setAlreadySubmitted(true);
          
          const hasDesc = questionsData?.some(q => 
            ['short_answer', 'long_answer'].includes(q.question_type)
          ) || false;
          
          setSubmitResult({
            mcqScore: existingAttempt.mcq_score || 0,
            totalMarks: testData.total_marks || 0,
            hasDescriptive: hasDesc,
            percentage: existingAttempt.score || 0,
          });
        } else {
          setAttemptId(existingAttempt.id);
          setWasResumed(true);

          // Try to restore from local storage first (more recent)
          const localData = localStorage.getItem(LOCAL_STORAGE_KEY + testId);
          if (localData) {
            try {
              const parsed = JSON.parse(localData);
              if (parsed.answers) {
                setAnswers(parsed.answers);
              }
            } catch (e) {
              setAnswers((existingAttempt.answers as Record<string, Answer>) || {});
            }
          } else {
            setAnswers((existingAttempt.answers as Record<string, Answer>) || {});
          }
          
          const startTime = new Date(existingAttempt.started_at).getTime();
          const elapsed = Math.floor((Date.now() - startTime) / 1000);
          const remaining = testData.duration_minutes * 60 - elapsed;
          
          if (remaining <= 0) {
            setTimeLeft(0);
            // Auto-submit with a slight delay to show UI
            setTimeout(() => submitTest(true), 500);
          } else {
            setTimeLeft(remaining);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching test data:', error);
      toast({
        title: 'Unable to load test',
        description: 'Please check your connection and try again.',
        variant: 'destructive',
      });
    }

    setIsLoading(false);
  };

  const startAttempt = async () => {
    if (!user || !testId) return;

    try {
      // Hard DB-enforced session lock + atomic create-or-resume
      const { data, error } = await supabase.rpc('start_test_attempt_locked', {
        p_test_id: testId,
      });

      if (error) throw error;
      const result = data as {
        status: string;
        attempt_id?: string;
        code?: string;
        blocking_test_title?: string;
        blocking_test_id?: string;
      };

      if (result?.status === 'already_submitted') {
        toast({
          title: 'Test Already Submitted',
          description: 'You have already completed this test.',
        });
        setAlreadySubmitted(true);
        setIsCompleted(true);
        return;
      }

      if (result?.status === 'locked') {
        toast({
          title: 'Another Test In Progress',
          description: `Please finish "${result.blocking_test_title}" before starting a new test.`,
          variant: 'destructive',
        });
        navigate(`/dashboard/tests/${result.blocking_test_id}`);
        return;
      }

      if (result?.status === 'resumed' && result.attempt_id) {
        setAttemptId(result.attempt_id);
        setWasResumed(true);
        toast({
          title: 'Test Resumed',
          description: 'Welcome back! Your previous answers are restored.',
        });
        return;
      }

      if (result?.status === 'started' && result.attempt_id) {
        setAttemptId(result.attempt_id);
        toast({
          title: 'Test Started',
          description: 'Good luck! Your timer has started.',
        });
        return;
      }

      // Fallback error
      toast({
        title: 'Unable to start test',
        description: 'Please try again.',
        variant: 'destructive',
      });
    } catch (error) {
      console.error('Error starting attempt:', error);
      toast({
        title: 'Unable to start test',
        description: 'Please check your connection and try again.',
        variant: 'destructive',
      });
    }
  };

  // Locked-sequence auto-advance for Sunday Special tests
  // Saves current answer, advances to next question, resets backend timer
  const handleSundayAutoAdvance = useCallback(async () => {
    if (!attemptId || !isSundaySpecial) return;
    const isLast = currentIndex >= shuffledQuestions.length - 1;

    // Persist current answer to DB (best-effort)
    try {
      await supabase
        .from('test_attempts')
        .update({ answers: JSON.parse(JSON.stringify(answers)) })
        .eq('id', attemptId);
    } catch (e) {
      console.error('Sunday autosave failed:', e);
    }

    if (isLast) {
      // Last question — submit
      submitTest(true);
      return;
    }

    // Slide-out animation, then advance
    setSlideDirection('out');
    setTimeout(async () => {
      const nextIndex = currentIndex + 1;
      try {
        await supabase.rpc('advance_sunday_question', {
          p_attempt_id: attemptId,
          p_next_index: nextIndex,
        });
      } catch (e) {
        console.error('advance_sunday_question failed:', e);
      }
      setCurrentIndex(nextIndex);
      setQuestionTimeLeft(60);
      setSlideDirection('in');
    }, 200);
  }, [attemptId, isSundaySpecial, currentIndex, shuffledQuestions.length, answers, submitTest]);

  // Sync per-question timer with backend (anti-cheat: refresh restores remaining time)
  useEffect(() => {
    if (!isSundaySpecial || !attemptId || isCompleted) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.rpc('start_sunday_question', {
          p_attempt_id: attemptId,
          p_question_index: currentIndex,
        });
        if (cancelled) return;
        const result = data as { remaining_seconds?: number; forced_question_index?: number };
        if (typeof result?.forced_question_index === 'number' && result.forced_question_index !== currentIndex) {
          // Backend forces them back to the question they're supposed to be on
          setCurrentIndex(result.forced_question_index);
          setQuestionTimeLeft(result.remaining_seconds ?? 60);
          return;
        }
        setQuestionTimeLeft(Math.max(0, result?.remaining_seconds ?? 60));
      } catch (e) {
        console.error('start_sunday_question failed:', e);
        setQuestionTimeLeft(60);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isSundaySpecial, attemptId, currentIndex, isCompleted]);

  // Per-question countdown for Sunday Special
  useEffect(() => {
    if (!isSundaySpecial || !attemptId || isCompleted) return;
    if (questionTimeLeft <= 0) {
      handleSundayAutoAdvance();
      return;
    }
    const id = setInterval(() => {
      setQuestionTimeLeft((prev) => {
        if (prev <= 1) {
          handleSundayAutoAdvance();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [isSundaySpecial, attemptId, isCompleted, questionTimeLeft, handleSundayAutoAdvance]);

  // Overall test timer (skipped for Sunday Special — that uses per-question timer)
  useEffect(() => {
    if (isSundaySpecial) return;
    if (!attemptId || isCompleted || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Time's up - auto submit silently
          submitTest(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [attemptId, isCompleted, timeLeft, submitTest, isSundaySpecial]);

  // Auto-save to local storage (every answer change)
  useEffect(() => {
    if (!attemptId || isCompleted) return;

    const saveData = {
      answers,
      timestamp: Date.now(),
    };
    localStorage.setItem(LOCAL_STORAGE_KEY + testId, JSON.stringify(saveData));
  }, [answers, attemptId, isCompleted, testId]);

  // Periodic save to database (every 15 seconds)
  useEffect(() => {
    if (!attemptId || isCompleted) return;

    const saveTimer = setInterval(async () => {
      if (!navigator.onLine) return; // Skip if offline
      
      try {
        await supabase
          .from('test_attempts')
          .update({ answers: JSON.parse(JSON.stringify(answers)) })
          .eq('id', attemptId);
      } catch (e) {
        // Silent fail for auto-save
        console.error('Auto-save failed:', e);
      }
    }, 15000);

    return () => clearInterval(saveTimer);
  }, [answers, attemptId, isCompleted]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const setAnswer = (questionId: string, answer: Answer) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const toggleSelection = (questionId: string, index: number, isMultiple: boolean) => {
    const current = answers[questionId]?.selected || [];
    
    if (isMultiple) {
      const newSelected = current.includes(index)
        ? current.filter(i => i !== index)
        : [...current, index];
      setAnswer(questionId, { selected: newSelected });
    } else {
      setAnswer(questionId, { selected: [index] });
    }
  };

  const getAnsweredCount = () => {
    return questions.filter(q => {
      const answer = answers[q.id];
      if (['mcq_single', 'mcq_multiple', 'true_false'].includes(q.question_type)) {
        return answer?.selected && answer.selected.length > 0;
      }
      return answer?.text && answer.text.trim().length > 0;
    }).length;
  };

  // Handle retry after failure
  const handleRetrySubmit = () => {
    setSubmitState('idle');
    submitLockRef.current = false;
    submitTest(false);
  };

  // Handle offline state retry
  const handleOfflineRetry = () => {
    if (navigator.onLine) {
      setSubmitState('idle');
      submitTest(false);
    } else {
      toast({
        title: 'Still Offline',
        description: 'Please check your internet connection.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Submitting overlay - covers the whole screen
  if (submitState === 'submitting' || submitState === 'slow') {
    return (
      <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="max-w-sm mx-auto text-center px-4">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
          </div>
          <h2 className="text-xl font-display font-bold text-foreground mb-2">
            Submitting Your Test
          </h2>
          <p className="text-muted-foreground mb-4">
            {submitState === 'slow' 
              ? 'Taking longer than expected. Please stay on this page...'
              : 'Please wait while we save your answers. Do not close this page.'}
          </p>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-primary animate-pulse w-2/3" />
          </div>
          {submitState === 'slow' && (
            <p className="text-xs text-muted-foreground mt-4">
              Your answers are safely saved locally. If this takes too long, contact your admin.
            </p>
          )}
        </div>
      </div>
    );
  }

  // Offline state - cannot submit
  if (submitState === 'offline') {
    return (
      <div className="max-w-sm mx-auto text-center py-12 px-4">
        <div className="w-20 h-20 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-6">
          <WifiOff className="w-10 h-10 text-warning" />
        </div>
        <h2 className="text-xl font-display font-bold text-foreground mb-2">
          No Internet Connection
        </h2>
        <p className="text-muted-foreground mb-6">
          Please reconnect to the internet before submitting your test. Your answers are saved locally and will not be lost.
        </p>
        <div className="flex flex-col gap-3">
          <Button onClick={handleOfflineRetry} size="lg" className="w-full">
            <RefreshCw className="w-4 h-4 mr-2" />
            Check Connection & Submit
          </Button>
          <Button variant="outline" onClick={() => setSubmitState('idle')} className="w-full">
            Return to Test
          </Button>
        </div>
      </div>
    );
  }

  // Failed submission UI - clean and calm
  if (submitState === 'failed') {
    return (
      <div className="max-w-sm mx-auto text-center py-12 px-4">
        <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-10 h-10 text-destructive" />
        </div>
        <h2 className="text-xl font-display font-bold text-foreground mb-2">
          Submission Could Not Complete
        </h2>
        <p className="text-muted-foreground mb-6">
          We had trouble submitting your test. Your answers are safely saved on this device. Please try again or contact your teacher if the problem continues.
        </p>
        <div className="flex flex-col gap-3">
          <Button onClick={handleRetrySubmit} size="lg" className="w-full">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
          <Button variant="outline" onClick={() => setSubmitState('idle')} className="w-full">
            Return to Test
          </Button>
          <p className="text-xs text-muted-foreground">
            Your answers are safe. You can try submitting again when ready.
          </p>
        </div>
      </div>
    );
  }

  // Completed state
  if (isCompleted && submitResult) {
    return (
      <div className="max-w-xl mx-auto animate-fade-in px-4">
        <div className="dashboard-card text-center py-12">
          <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-success" />
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground mb-2">
            Test Submitted Successfully!
          </h1>
          <p className="text-muted-foreground mb-6">
            You have completed "{test?.title}"
          </p>
          
          {submitResult.hasDescriptive ? (
            <div className="space-y-4 mb-6">
              <div className="bg-accent/50 rounded-xl p-6">
                <p className="text-sm text-muted-foreground mb-4">
                  Your test contains descriptive answers that require manual evaluation.
                </p>
                <div className="bg-background rounded-lg p-4">
                  <p className="text-xs text-muted-foreground mb-1">MCQ Score (Auto-Evaluated)</p>
                  <p className="text-2xl font-bold text-primary">
                    {submitResult.mcqScore} / {submitResult.totalMarks} marks
                  </p>
                </div>
              </div>
              <div className="bg-warning/10 rounded-xl p-4 flex items-start gap-3">
                <Clock className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                <p className="text-sm text-left">
                  <span className="font-medium">Result Pending:</span> Your final score will be available after the admin reviews your descriptive answers.
                </p>
              </div>
            </div>
          ) : (
            <div className="mb-6">
              <div className="text-6xl font-display font-bold text-primary mb-2">
                {submitResult.percentage}%
              </div>
              <p className="text-lg text-muted-foreground">
                {submitResult.mcqScore} / {submitResult.totalMarks} marks
              </p>
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="outline" onClick={() => navigate(`/dashboard/results/${attemptId}`)} size="lg" className="gap-2">
              <Eye className="w-4 h-4" />
              View Detailed Result
            </Button>
            <Button onClick={() => navigate('/dashboard/tests')} size="lg">
              Back to Tests
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Already submitted but no result data
  if (isCompleted) {
    return (
      <div className="max-w-xl mx-auto animate-fade-in px-4">
        <div className="dashboard-card text-center py-12">
          <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-success" />
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground mb-2">
            Test Already Submitted
          </h1>
          <p className="text-muted-foreground mb-6">
            You have already completed this test.
          </p>
          <Button onClick={() => navigate('/dashboard/tests')} size="lg">
            Back to Tests
          </Button>
        </div>
      </div>
    );
  }

  if (!attemptId) {
    return (
      <div className="max-w-xl mx-auto animate-fade-in px-4">
        <div className="dashboard-card text-center py-8">
          <h1 className="text-2xl font-display font-bold text-foreground mb-2">
            {test?.title}
          </h1>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground mb-6">
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {test?.duration_minutes} minutes
            </span>
            <span>{questions.length} questions</span>
            <span>{test?.total_marks} marks</span>
          </div>
          
          {test?.description && (
            <p className="text-muted-foreground mb-6">{test.description}</p>
          )}
          
          <div className="bg-warning/10 rounded-xl p-4 mb-6 text-left">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-warning mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-foreground mb-2">Important Instructions:</p>
                <ul className="text-muted-foreground space-y-1">
                  <li>• You can only attempt this test once</li>
                  <li>• Timer starts when you click "Start Test"</li>
                  <li>• Test auto-submits when time runs out</li>
                  <li>• Your answers are saved automatically</li>
                  <li className="text-destructive font-medium">• Do NOT switch tabs or leave the page</li>
                  <li className="text-destructive font-medium">• Violations will auto-submit your test</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-primary/5 rounded-xl p-4 mb-6 flex items-center gap-3">
            <Shield className="w-6 h-6 text-primary" />
            <p className="text-sm text-muted-foreground text-left">
              This test has anti-cheating protection. Stay on this page throughout the test.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="outline" onClick={() => navigate('/dashboard/tests')}>
              Go Back
            </Button>
            <Button onClick={startAttempt} size="lg">
              Start Test
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = shuffledQuestions[currentIndex];
  const currentAnswer = answers[currentQuestion?.id];
  const isMarked = markedForReview.has(currentQuestion?.id);

  return (
    <div className="max-w-2xl mx-auto animate-fade-in pb-24 md:pb-6">
      {/* Sticky Timer Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm -mx-4 px-4 py-3 mb-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="font-medium text-foreground text-sm truncate">{test?.title}</p>
            <p className="text-xs text-muted-foreground">
              Q {currentIndex + 1} of {questions.length}
            </p>
          </div>
          
          {violationCount > 0 && (
            <div className="text-xs text-destructive bg-destructive/10 px-2 py-1 rounded-full mr-2">
              ⚠️ {3 - violationCount} warnings left
            </div>
          )}
          
          {isSundaySpecial ? (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-mono font-bold text-base ${
              questionTimeLeft <= 10
                ? 'bg-destructive/10 text-destructive animate-pulse'
                : questionTimeLeft <= 20
                ? 'bg-warning/10 text-warning'
                : 'bg-primary/10 text-primary'
            }`}>
              <Clock className="w-4 h-4" />
              {questionTimeLeft.toString().padStart(2, '0')}s
            </div>
          ) : (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-mono font-semibold ${
              timeLeft < 60 ? 'bg-destructive/10 text-destructive animate-pulse' :
              timeLeft < 300 ? 'bg-warning/10 text-warning' :
              'bg-accent text-accent-foreground'
            }`}>
              <Clock className="w-4 h-4" />
              {formatTime(timeLeft)}
            </div>
          )}
        </div>

        {isSundaySpecial && (
          <div className="mt-1 flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-gradient-to-r from-amber-500 to-orange-500 text-white">
              🏆 Sunday Special
            </span>
            <span className="text-[10px] text-muted-foreground">
              Locked sequence — no going back
            </span>
          </div>
        )}

        {/* Progress bar */}
        <div className="mt-2 h-1 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      <div
        key={isSundaySpecial ? `q-${currentIndex}` : 'standard'}
        className={`dashboard-card mb-4 ${
          isSundaySpecial
            ? slideDirection === 'in'
              ? 'animate-[slideInRight_0.3s_ease-out]'
              : 'opacity-0 -translate-x-8 transition-all duration-200'
            : ''
        }`}
        style={{
          // Inline keyframes for slide-in (slide-left = next question slides in from right)
          ...(isSundaySpecial ? {} : {}),
        }}
      >
        <style>{`
          @keyframes slideInRight {
            from { opacity: 0; transform: translateX(40px); }
            to { opacity: 1; transform: translateX(0); }
          }
        `}</style>
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-medium px-2 py-1 rounded-full bg-accent text-accent-foreground">
            {currentQuestion?.marks} mark{currentQuestion?.marks !== 1 ? 's' : ''}
          </span>
          {!isSundaySpecial && (
            <Button
              variant={isMarked ? 'default' : 'ghost'}
              size="sm"
              onClick={() => {
                const newMarked = new Set(markedForReview);
                if (isMarked) {
                  newMarked.delete(currentQuestion.id);
                } else {
                  newMarked.add(currentQuestion.id);
                }
                setMarkedForReview(newMarked);
              }}
            >
              <Flag className={`w-4 h-4 mr-1 ${isMarked ? 'fill-current' : ''}`} />
              {isMarked ? 'Marked' : 'Mark for Review'}
            </Button>
          )}
        </div>
        
        <p className="text-lg font-medium text-foreground mb-6 leading-relaxed">
          {currentQuestion?.question_text}
        </p>

        {/* MCQ Single / True-False */}
        {['mcq_single', 'true_false'].includes(currentQuestion?.question_type) && (
          <RadioGroup
            value={currentAnswer?.selected?.[0]?.toString() || ''}
            onValueChange={(value) => toggleSelection(currentQuestion.id, parseInt(value), false)}
            className="space-y-3"
          >
            {currentQuestion?.options.map((option, index) => (
              <div
                key={index}
                className={`flex items-center space-x-4 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                  currentAnswer?.selected?.includes(index)
                    ? 'border-primary bg-accent'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => toggleSelection(currentQuestion.id, index, false)}
              >
                <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer text-base">
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        )}

        {/* MCQ Multiple */}
        {currentQuestion?.question_type === 'mcq_multiple' && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground mb-2">Select all correct answers</p>
            {currentQuestion?.options.map((option, index) => (
              <div
                key={index}
                className={`flex items-center space-x-4 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                  currentAnswer?.selected?.includes(index)
                    ? 'border-primary bg-accent'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => toggleSelection(currentQuestion.id, index, true)}
              >
                <Checkbox
                  checked={currentAnswer?.selected?.includes(index) || false}
                  onCheckedChange={() => toggleSelection(currentQuestion.id, index, true)}
                  id={`option-${index}`}
                />
                <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer text-base">
                  {option}
                </Label>
              </div>
            ))}
          </div>
        )}

        {/* Short Answer */}
        {currentQuestion?.question_type === 'short_answer' && (
          <Textarea
            placeholder="Type your answer here (2-3 lines)..."
            value={currentAnswer?.text || ''}
            onChange={(e) => setAnswer(currentQuestion.id, { text: e.target.value })}
            rows={3}
            className="text-base"
            maxLength={500}
          />
        )}

        {/* Long Answer */}
        {currentQuestion?.question_type === 'long_answer' && (
          <Textarea
            placeholder="Type your detailed answer here..."
            value={currentAnswer?.text || ''}
            onChange={(e) => setAnswer(currentQuestion.id, { text: e.target.value })}
            rows={8}
            className="text-base min-h-[200px]"
          />
        )}
      </div>

      {/* Navigation Buttons */}
      {isSundaySpecial ? (
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="outline"
            disabled
            className="flex-1 sm:flex-none opacity-50"
            title="Locked sequence — Sunday Special tests cannot go back"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Locked
          </Button>
          {currentIndex === shuffledQuestions.length - 1 ? (
            <Button
              onClick={() => handleSundayAutoAdvance()}
              disabled={submitState !== 'idle'}
              className="flex-1 sm:flex-none"
            >
              <Send className="w-4 h-4 mr-2" />
              Submit Final Answer
            </Button>
          ) : (
            <Button
              onClick={() => handleSundayAutoAdvance()}
              className="flex-1 sm:flex-none"
            >
              Next Question
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentIndex === 0}
            className="flex-1 sm:flex-none"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowNavigator(!showNavigator)}
            className="hidden sm:flex"
          >
            {getAnsweredCount()}/{questions.length} answered
          </Button>

          {currentIndex === questions.length - 1 ? (
            <Button
              onClick={() => setShowSubmitDialog(true)}
              disabled={submitState !== 'idle'}
              className="flex-1 sm:flex-none"
            >
              <Send className="w-4 h-4 mr-2" />
              Submit Test
            </Button>
          ) : (
            <Button
              onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
              className="flex-1 sm:flex-none"
            >
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      )}

      {/* Question Navigator Toggle for Mobile (hidden in Sunday Special) */}
      {!isSundaySpecial && (
        <div className="mt-4 sm:hidden">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowNavigator(!showNavigator)}
          >
            Question Navigator ({getAnsweredCount()}/{questions.length} answered)
          </Button>
        </div>
      )}

      {/* Question Navigator */}
      {showNavigator && !isSundaySpecial && (
        <div className="mt-4 p-4 bg-card rounded-xl border">
          <div className="flex flex-wrap gap-2">
            {shuffledQuestions.map((q, index) => {
              const answered = (() => {
                const ans = answers[q.id];
                if (['mcq_single', 'mcq_multiple', 'true_false'].includes(q.question_type)) {
                  return ans?.selected && ans.selected.length > 0;
                }
                return ans?.text && ans.text.trim().length > 0;
              })();
              const marked = markedForReview.has(q.id);
              
              return (
                <button
                  key={q.id}
                  onClick={() => {
                    setCurrentIndex(index);
                    setShowNavigator(false);
                  }}
                  className={`w-10 h-10 rounded-lg font-medium text-sm transition-colors relative ${
                    currentIndex === index
                      ? 'bg-primary text-primary-foreground'
                      : answered
                      ? 'bg-success/10 text-success border border-success/20'
                      : 'bg-secondary text-secondary-foreground'
                  }`}
                >
                  {index + 1}
                  {marked && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-warning rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-success/10 border border-success/20" /> Answered
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-secondary" /> Not answered
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-warning" /> Marked for review
            </span>
          </div>
        </div>
      )}

      {/* Submit Confirmation Dialog - Clear and Professional */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-xl">
              <Send className="w-5 h-5 text-primary" />
              Submit Your Test?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 pt-2">
                {/* Summary */}
                <div className="bg-accent/50 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-muted-foreground">Questions Answered</span>
                    <span className="font-semibold text-foreground">
                      {getAnsweredCount()} / {questions.length}
                    </span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all"
                      style={{ width: `${(getAnsweredCount() / questions.length) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Warning for unanswered */}
                {getAnsweredCount() < questions.length && (
                  <div className="flex items-start gap-2 p-3 bg-warning/10 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-warning">
                      You have {questions.length - getAnsweredCount()} unanswered question(s). 
                      Unanswered questions will receive zero marks.
                    </p>
                  </div>
                )}

                {/* Final warning */}
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Important:</strong> Once submitted, you cannot change your answers. 
                  Make sure you have reviewed all your responses.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="flex-1 sm:flex-none">
              Review Answers
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => submitTest(false)} 
              className="flex-1 sm:flex-none bg-primary hover:bg-primary/90"
            >
              <Send className="w-4 h-4 mr-2" />
              Confirm Submit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
