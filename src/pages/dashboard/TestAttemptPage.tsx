import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Clock, AlertCircle, CheckCircle, ArrowLeft, ArrowRight, Flag, Send, Shield, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { useAntiCheat } from '@/hooks/useAntiCheat';
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

const LOCAL_STORAGE_KEY = 'test-attempt-';

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showNavigator, setShowNavigator] = useState(false);
  const [violationCount, setViolationCount] = useState(0);
  const [hasDescriptiveQuestions, setHasDescriptiveQuestions] = useState(false);
  
  const submitInProgressRef = useRef(false);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  // Reliable submit function with retry logic
  const submitTest = useCallback(async (forceSubmit = false) => {
    if (!attemptId || submitInProgressRef.current) return;
    
    submitInProgressRef.current = true;
    setIsSubmitting(true);

    // Calculate MCQ score
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
          // For multiple correct, all must match
          if (selected.length === correct.length && 
              selected.every(s => correct.includes(s)) &&
              correct.every(c => selected.includes(c))) {
            mcqScore += q.marks;
          }
        } else {
          // For single correct
          if (selected.length === 1 && correct.includes(selected[0])) {
            mcqScore += q.marks;
          }
        }
      } else {
        hasDescriptive = true;
      }
    });

    const totalMarks = test?.total_marks || 0;
    const calculatedScore = totalMarks > 0 ? Math.round((mcqScore / totalMarks) * 100) : 0;

    const updateData = {
      answers: JSON.parse(JSON.stringify(answers)),
      score: hasDescriptive ? null : calculatedScore,
      mcq_score: mcqScore,
      submitted_at: new Date().toISOString(),
      evaluation_status: hasDescriptive ? 'pending' : 'completed',
    };

    try {
      const { error } = await supabase
        .from('test_attempts')
        .update(updateData)
        .eq('id', attemptId);

      if (error) {
        throw error;
      }

      // Clear local storage
      localStorage.removeItem(LOCAL_STORAGE_KEY + testId);
      
      setScore(calculatedScore);
      setIsCompleted(true);
      submitInProgressRef.current = false;
      setIsSubmitting(false);
      retryCountRef.current = 0;

      toast({
        title: 'Test Submitted!',
        description: hasDescriptive 
          ? 'MCQ answers evaluated. Descriptive answers pending review.' 
          : `You scored ${mcqScore}/${totalMarks} marks`,
      });
    } catch (error: any) {
      console.error('Submit error:', error);
      retryCountRef.current += 1;

      if (retryCountRef.current < maxRetries) {
        toast({
          title: 'Retrying...',
          description: `Network issue. Retrying (${retryCountRef.current}/${maxRetries})...`,
          variant: 'destructive',
        });
        
        // Wait and retry
        setTimeout(() => {
          submitInProgressRef.current = false;
          submitTest(forceSubmit);
        }, 2000);
      } else {
        toast({
          title: 'Submission Failed',
          description: 'Please check your internet and try again. Your answers are saved locally.',
          variant: 'destructive',
        });
        submitInProgressRef.current = false;
        setIsSubmitting(false);
        retryCountRef.current = 0;
      }
    }
  }, [attemptId, answers, questions, test, toast, testId]);

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
    const { data: testData } = await supabase
      .from('tests')
      .select('id, title, duration_minutes, total_marks, description')
      .eq('id', testId)
      .single();

    if (!testData) {
      navigate('/dashboard/tests');
      return;
    }

    setTest(testData);
    setTimeLeft(testData.duration_minutes * 60);

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
      
      // Check for descriptive questions
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
      .single();

    if (existingAttempt) {
      if (existingAttempt.submitted_at) {
        setIsCompleted(true);
        setScore(existingAttempt.score);
      } else {
        setAttemptId(existingAttempt.id);
        
        // Try to restore from local storage first (more recent)
        const localData = localStorage.getItem(LOCAL_STORAGE_KEY + testId);
        if (localData) {
          try {
            const parsed = JSON.parse(localData);
            if (parsed.answers) {
              setAnswers(parsed.answers);
            }
          } catch (e) {
            // Fall back to DB answers
            setAnswers((existingAttempt.answers as Record<string, Answer>) || {});
          }
        } else {
          setAnswers((existingAttempt.answers as Record<string, Answer>) || {});
        }
        
        const startTime = new Date(existingAttempt.started_at).getTime();
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const remaining = testData.duration_minutes * 60 - elapsed;
        
        if (remaining <= 0) {
          // Time already expired, auto-submit
          setTimeLeft(0);
          submitTest(true);
        } else {
          setTimeLeft(remaining);
        }
      }
    }

    setIsLoading(false);
  };

  const startAttempt = async () => {
    if (!user || !testId) return;

    const { data, error } = await supabase
      .from('test_attempts')
      .insert([{
        user_id: user.id,
        test_id: testId,
        answers: {},
      }])
      .select()
      .single();

    if (data) {
      setAttemptId(data.id);
      toast({
        title: 'Test Started',
        description: 'Good luck! Your timer has started.',
      });
    } else if (error) {
      toast({
        title: 'Error',
        description: 'Failed to start test. You may have already attempted this test.',
        variant: 'destructive',
      });
      navigate('/dashboard/tests');
    }
  };

  // Timer
  useEffect(() => {
    if (!attemptId || isCompleted || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Time's up - auto submit
          toast({
            title: "Time's Up!",
            description: 'Auto-submitting your test...',
            variant: 'destructive',
          });
          submitTest(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [attemptId, isCompleted, timeLeft, submitTest, toast]);

  // Auto-save to local storage (more frequent)
  useEffect(() => {
    if (!attemptId || isCompleted) return;

    const saveData = {
      answers,
      timestamp: Date.now(),
    };
    localStorage.setItem(LOCAL_STORAGE_KEY + testId, JSON.stringify(saveData));
  }, [answers, attemptId, isCompleted, testId]);

  // Periodic save to database (less frequent)
  useEffect(() => {
    if (!attemptId || isCompleted) return;

    const saveTimer = setInterval(async () => {
      try {
        await supabase
          .from('test_attempts')
          .update({ answers: JSON.parse(JSON.stringify(answers)) })
          .eq('id', attemptId);
      } catch (e) {
        console.error('Auto-save failed:', e);
      }
    }, 10000); // Every 10 seconds

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div className="max-w-xl mx-auto animate-fade-in px-4">
        <div className="dashboard-card text-center py-12">
          <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-success" />
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground mb-2">
            Test Completed!
          </h1>
          <p className="text-muted-foreground mb-6">
            You have completed "{test?.title}"
          </p>
          {hasDescriptiveQuestions ? (
            <div className="bg-accent/50 rounded-lg p-4 mb-6">
              <p className="text-sm text-muted-foreground">
                Your test contains descriptive answers that require manual evaluation.
                Your final result will be available once reviewed by the admin.
              </p>
            </div>
          ) : (
            <>
              <div className="text-5xl font-display font-bold text-primary mb-2">
                {score}%
              </div>
              <p className="text-sm text-muted-foreground mb-6">Your Score</p>
            </>
          )}
          <Button onClick={() => navigate('/dashboard/tests')}>
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
                  <li className="text-destructive font-medium">• Violations will reset your test</li>
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

  const currentQuestion = questions[currentIndex];
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
          
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-mono font-semibold ${
            timeLeft < 60 ? 'bg-destructive/10 text-destructive animate-pulse' : 
            timeLeft < 300 ? 'bg-warning/10 text-warning' : 
            'bg-accent text-accent-foreground'
          }`}>
            <Clock className="w-4 h-4" />
            {formatTime(timeLeft)}
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="mt-2 h-1 bg-secondary rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      <div className="dashboard-card mb-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-medium px-2 py-1 rounded-full bg-accent text-accent-foreground">
            {currentQuestion?.marks} mark{currentQuestion?.marks !== 1 ? 's' : ''}
          </span>
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
            disabled={isSubmitting}
            className="flex-1 sm:flex-none"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            {isSubmitting ? 'Submitting...' : 'Submit'}
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

      {/* Question Navigator Toggle for Mobile */}
      <div className="mt-4 sm:hidden">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setShowNavigator(!showNavigator)}
        >
          Question Navigator ({getAnsweredCount()}/{questions.length} answered)
        </Button>
      </div>

      {/* Question Navigator */}
      {showNavigator && (
        <div className="mt-4 p-4 bg-card rounded-xl border">
          <div className="flex flex-wrap gap-2">
            {questions.map((q, index) => {
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

      {/* Submit Confirmation Dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Test?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>You have answered {getAnsweredCount()} out of {questions.length} questions.</p>
              {getAnsweredCount() < questions.length && (
                <p className="text-warning font-medium">
                  ⚠️ {questions.length - getAnsweredCount()} question(s) are unanswered.
                </p>
              )}
              <p>Once submitted, you cannot change your answers.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Review Answers</AlertDialogCancel>
            <AlertDialogAction onClick={() => submitTest()} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Test'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
