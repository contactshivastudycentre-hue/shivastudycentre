import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Clock, AlertCircle, CheckCircle, ArrowLeft, ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';

interface Question {
  id: string;
  question_text: string;
  options: string[];
  correct_option_index: number;
}

interface Test {
  id: string;
  title: string;
  duration_minutes: number;
}

export default function TestAttemptPage() {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [score, setScore] = useState<number | null>(null);

  useEffect(() => {
    if (testId) {
      fetchTestData();
    }
  }, [testId]);

  const fetchTestData = async () => {
    // Fetch test
    const { data: testData } = await supabase
      .from('tests')
      .select('id, title, duration_minutes')
      .eq('id', testId)
      .single();

    if (!testData) {
      navigate('/dashboard/tests');
      return;
    }

    setTest(testData);
    setTimeLeft(testData.duration_minutes * 60);

    // Fetch questions
    const { data: questionsData } = await supabase
      .from('questions')
      .select('*')
      .eq('test_id', testId);

    if (questionsData) {
      setQuestions(questionsData.map(q => ({
        ...q,
        options: q.options as string[]
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
        setAnswers((existingAttempt.answers as Record<string, number>) || {});
        // Calculate remaining time
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
      .insert({
        user_id: user.id,
        test_id: testId,
        answers: {},
      })
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

    // Calculate score
    let correct = 0;
    questions.forEach((q) => {
      if (answers[q.id] === q.correct_option_index) {
        correct++;
      }
    });

    const calculatedScore = Math.round((correct / questions.length) * 100);

    const { error } = await supabase
      .from('test_attempts')
      .update({
        answers,
        score: calculatedScore,
        submitted_at: new Date().toISOString(),
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
      description: `You scored ${calculatedScore}%`,
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
        .update({ answers })
        .eq('id', attemptId);
    }, 2000);

    return () => clearTimeout(saveTimer);
  }, [answers, attemptId, isCompleted]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
      <div className="max-w-xl mx-auto animate-fade-in">
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
          <div className="text-5xl font-display font-bold text-primary mb-6">
            {score}%
          </div>
          <Button onClick={() => navigate('/dashboard/tests')}>
            Back to Tests
          </Button>
        </div>
      </div>
    );
  }

  if (!attemptId) {
    return (
      <div className="max-w-xl mx-auto animate-fade-in">
        <div className="dashboard-card text-center py-12">
          <h1 className="text-2xl font-display font-bold text-foreground mb-2">
            {test?.title}
          </h1>
          <p className="text-muted-foreground mb-6">
            {questions.length} questions • {test?.duration_minutes} minutes
          </p>
          <div className="bg-warning/10 rounded-xl p-4 mb-6 flex items-start gap-3 text-left">
            <AlertCircle className="w-5 h-5 text-warning mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-foreground">Before you start:</p>
              <ul className="text-muted-foreground mt-1 space-y-1">
                <li>• You can only attempt this test once</li>
                <li>• Timer starts when you click "Start Test"</li>
                <li>• Test auto-submits when time runs out</li>
              </ul>
            </div>
          </div>
          <div className="flex gap-4 justify-center">
            <Button variant="outline" onClick={() => navigate('/dashboard/tests')}>
              Go Back
            </Button>
            <Button onClick={startAttempt}>Start Test</Button>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      {/* Timer Header */}
      <div className="dashboard-card mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-semibold text-foreground">{test?.title}</h1>
            <p className="text-sm text-muted-foreground">
              Question {currentIndex + 1} of {questions.length}
            </p>
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
            timeLeft < 60 ? 'bg-destructive/10 text-destructive' : 'bg-accent text-accent-foreground'
          }`}>
            <Clock className="w-4 h-4" />
            <span className="font-mono font-semibold">{formatTime(timeLeft)}</span>
          </div>
        </div>
      </div>

      {/* Question */}
      <div className="dashboard-card mb-6">
        <p className="text-lg font-medium text-foreground mb-6">
          {currentQuestion?.question_text}
        </p>

        <RadioGroup
          value={answers[currentQuestion?.id]?.toString() || ''}
          onValueChange={(value) => {
            setAnswers((prev) => ({
              ...prev,
              [currentQuestion.id]: parseInt(value),
            }));
          }}
          className="space-y-3"
        >
          {currentQuestion?.options.map((option, index) => (
            <div
              key={index}
              className={`flex items-center space-x-3 p-4 rounded-xl border transition-colors cursor-pointer ${
                answers[currentQuestion.id] === index
                  ? 'border-primary bg-accent'
                  : 'border-border hover:border-primary/50'
              }`}
              onClick={() => {
                setAnswers((prev) => ({
                  ...prev,
                  [currentQuestion.id]: index,
                }));
              }}
            >
              <RadioGroupItem value={index.toString()} id={`option-${index}`} />
              <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                {option}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
          disabled={currentIndex === 0}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>

        {currentIndex === questions.length - 1 ? (
          <Button onClick={submitTest} disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit Test'}
          </Button>
        ) : (
          <Button
            onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
          >
            Next
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>

      {/* Question Navigator */}
      <div className="mt-6">
        <p className="text-sm text-muted-foreground mb-3">Question Navigator</p>
        <div className="flex flex-wrap gap-2">
          {questions.map((q, index) => (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(index)}
              className={`w-10 h-10 rounded-lg font-medium text-sm transition-colors ${
                currentIndex === index
                  ? 'bg-primary text-primary-foreground'
                  : answers[q.id] !== undefined
                  ? 'bg-success/10 text-success border border-success/20'
                  : 'bg-secondary text-secondary-foreground'
              }`}
            >
              {index + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
