import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Clock, AlertCircle, CheckCircle, ArrowLeft, ArrowRight, Flag, Send } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
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
      setQuestions(questionsData.map(q => ({
        id: q.id,
        question_text: q.question_text,
        question_type: (q.question_type as QuestionType) || 'mcq_single',
        options: (q.options as string[]) || [],
        correct_answers: (q.correct_answers as number[]) || [],
        marks: q.marks || 1,
      })));
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
        setAnswers((existingAttempt.answers as Record<string, Answer>) || {});
        const startTime = new Date(existingAttempt.started_at).getTime();
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const remaining = testData.duration_minutes * 60 - elapsed;
        setTimeLeft(Math.max(0, remaining));
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
        answers: JSON.parse('{}'),
      }])
      .select()
      .single();

    if (data) {
      setAttemptId(data.id);
    } else if (error) {
      toast({
        title: 'Error',
        description: 'Failed to start test. You may have already attempted this test.',
        variant: 'destructive',
      });
      navigate('/dashboard/tests');
    }
  };

  const submitTest = useCallback(async () => {
    if (!attemptId || isSubmitting) return;
    
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
          if (selected.length === correct.length && selected.every(s => correct.includes(s))) {
            mcqScore += q.marks;
          }
        } else {
          // For single correct
          if (selected.length === 1 && selected[0] === correct[0]) {
            mcqScore += q.marks;
          }
        }
      } else {
        hasDescriptive = true;
      }
    });

    const calculatedScore = mcqTotal > 0 ? Math.round((mcqScore / mcqTotal) * 100) : 0;

    const { error } = await supabase
      .from('test_attempts')
      .update({
        answers: JSON.parse(JSON.stringify(answers)),
        score: calculatedScore,
        mcq_score: mcqScore,
        submitted_at: new Date().toISOString(),
        evaluation_status: hasDescriptive ? 'pending' : 'completed',
      })
      .eq('id', attemptId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit test.',
        variant: 'destructive',
      });
      setIsSubmitting(false);
      return;
    }

    setScore(calculatedScore);
    setIsCompleted(true);
    setIsSubmitting(false);

    toast({
      title: 'Test Submitted!',
      description: hasDescriptive 
        ? 'MCQ answers evaluated. Descriptive answers pending review.' 
        : `You scored ${calculatedScore}%`,
    });
  }, [attemptId, answers, questions, isSubmitting, toast]);

  // Timer
  useEffect(() => {
    if (!attemptId || isCompleted || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          submitTest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [attemptId, isCompleted, timeLeft, submitTest]);

  // Auto-save answers
  useEffect(() => {
    if (!attemptId || isCompleted) return;

    const saveTimer = setTimeout(async () => {
      await supabase
        .from('test_attempts')
        .update({ answers: JSON.parse(JSON.stringify(answers)) })
        .eq('id', attemptId);
    }, 2000);

    return () => clearTimeout(saveTimer);
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
        <div className="animate-pulse text-muted-foreground">Loading test...</div>
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
          <div className="text-5xl font-display font-bold text-primary mb-2">
            {score}%
          </div>
          <p className="text-sm text-muted-foreground mb-6">MCQ Score</p>
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
                <p className="font-medium text-foreground mb-2">Instructions:</p>
                <ul className="text-muted-foreground space-y-1">
                  <li>• You can only attempt this test once</li>
                  <li>• Timer starts when you click "Start Test"</li>
                  <li>• Test auto-submits when time runs out</li>
                  <li>• Your answers are saved automatically</li>
                </ul>
              </div>
            </div>
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
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-mono font-semibold ${
            timeLeft < 60 ? 'bg-destructive/10 text-destructive animate-pulse' : 'bg-accent text-accent-foreground'
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
            <Send className="w-4 h-4 mr-2" />
            Submit
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
            <AlertDialogCancel>Review Answers</AlertDialogCancel>
            <AlertDialogAction onClick={submitTest} disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Test'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
