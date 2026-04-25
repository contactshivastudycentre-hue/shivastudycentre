import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { 
  ArrowLeft, 
  Plus, 
  Edit2, 
  Trash2, 
  Save, 
  Eye, 
  Rocket,
  ChevronDown,
  ChevronUp,
  GripVertical,
  CheckCircle,
  FileText,
  AlignLeft,
  Loader2,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { ClassSelect, CLASSES } from '@/components/ClassSelect';
import { SubjectSelect } from '@/components/SubjectSelect';
import { BulkQuestionParser } from '@/components/admin/BulkQuestionParser';
import { FileUploader } from '@/components/admin/FileUploader';

type QuestionType = 'mcq_single' | 'mcq_multiple' | 'true_false' | 'short_answer' | 'long_answer';
type WizardStep = 1 | 2 | 3 | 4;

interface Question {
  id: string;
  question_text: string;
  question_type: QuestionType;
  options: string[];
  correct_answers: number[];
  marks: number;
  isNew?: boolean;
  isEditing?: boolean;
}

interface Test {
  id: string;
  title: string;
  description: string | null;
  subject: string;
  class: string;
  duration_minutes: number;
  is_published: boolean;
  total_marks: number;
  start_time: string;
  end_time: string;
  banner_image: string;
  test_type: 'standard' | 'sunday_special' | 'practice' | 'weekly' | 'mock' | 'surprise_quiz';
  prize_pool: number | null;
  prize_type: string | null;
  prize_value: string | null;
  prize_description: string | null;
  class_group: 'single' | 'junior' | 'senior' | 'custom';
  eligible_classes: string[];
  lucky_winner_count: number;
  lucky_selection_method: 'random' | 'manual';
}

type RankKey = 'rank1' | 'rank2' | 'rank3' | 'lucky';
type PrizeType = 'trophy' | 'cash' | 'gift' | 'books' | 'certificate' | 'other';
interface PrizeRow { prize_type: PrizeType; prize_value: string; }
type PrizesState = Partial<Record<RankKey, PrizeRow>>;

const RANK1_TYPES: PrizeType[] = ['trophy', 'cash', 'gift', 'books', 'certificate', 'other'];
const OTHER_RANK_TYPES: PrizeType[] = ['cash', 'gift', 'books', 'certificate', 'other'];
const LUCKY_TYPES: PrizeType[] = ['cash', 'gift', 'books', 'certificate', 'other'];
const PRIZE_TYPE_LABELS: Record<PrizeType, string> = {
  trophy: '🏆 Trophy', cash: '💰 Cash', gift: '🎁 Gift',
  books: '📚 Books', certificate: '🏅 Certificate', other: '✨ Other',
};

const JUNIOR_CLASSES = ['Class 6', 'Class 7'];
const SENIOR_CLASSES = ['Class 8', 'Class 9', 'Class 10'];

function classesForGroup(group: Test['class_group'], primaryClass: string, custom: string[]): string[] {
  if (group === 'junior') return JUNIOR_CLASSES;
  if (group === 'senior') return SENIOR_CLASSES;
  if (group === 'custom') return custom;
  return primaryClass ? [primaryClass] : [];
}

function audienceLabel(group: Test['class_group'], list: string[]): string {
  if (group === 'junior') return 'Junior (6–7)';
  if (group === 'senior') return 'Senior (8–10)';
  if (group === 'custom') return list.length ? `Custom: ${list.join(', ')}` : 'Custom';
  return list[0] || '';
}

const questionTypeLabels: Record<QuestionType, string> = {
  mcq_single: 'MCQ (Single)',
  mcq_multiple: 'MCQ (Multiple)',
  true_false: 'True / False',
  short_answer: 'Short Answer',
  long_answer: 'Long Answer',
};

const questionTypeIcons: Record<QuestionType, React.ReactNode> = {
  mcq_single: <CheckCircle className="w-4 h-4" />,
  mcq_multiple: <CheckCircle className="w-4 h-4" />,
  true_false: <CheckCircle className="w-4 h-4" />,
  short_answer: <FileText className="w-4 h-4" />,
  long_answer: <AlignLeft className="w-4 h-4" />,
};

// Default marks by question type
const getDefaultMarks = (type: QuestionType): number => {
  switch (type) {
    case 'mcq_single':
    case 'mcq_multiple':
    case 'true_false':
      return 1;
    case 'short_answer':
      return 3;
    case 'long_answer':
      return 5;
    default:
      return 1;
  }
};

export default function TestBuilder() {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const isNew = testId === 'new';

  const [test, setTest] = useState<Test>({
    id: '',
    title: '',
    description: '',
    subject: '',
    class: '',
    duration_minutes: 30,
    is_published: false,
    total_marks: 0,
    start_time: '',
    end_time: '',
    banner_image: '',
    test_type: 'standard',
    prize_pool: null,
    prize_type: null,
    prize_value: null,
    prize_description: null,
    class_group: 'single',
    eligible_classes: [],
    lucky_winner_count: 0,
    lucky_selection_method: 'random',
  });
  const [prizes, setPrizes] = useState<PrizesState>({});
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [showBulkParser, setShowBulkParser] = useState(false);
  const [step, setStep] = useState<WizardStep>(1);

  const handleBulkQuestionsAdd = (parsedQuestions: Question[]) => {
    const questionsWithIds = parsedQuestions.map((q, i) => ({
      ...q,
      id: `temp-${Date.now()}-${i}`,
      isNew: true,
    }));
    setQuestions([...questions, ...questionsWithIds]);
  };

  useEffect(() => {
    if (!isNew && testId) {
      fetchTest();
    }
  }, [testId, isNew]);

  // Auto-save to localStorage for data protection
  useEffect(() => {
    if (test.title || questions.length > 0) {
      const saveData = { test, questions, timestamp: Date.now() };
      localStorage.setItem(`test-builder-${testId || 'new'}`, JSON.stringify(saveData));
    }
  }, [test, questions, testId]);

  // Load from localStorage on mount
  useEffect(() => {
    if (isNew) {
      const saved = localStorage.getItem('test-builder-new');
      if (saved) {
        try {
          const { test: savedTest, questions: savedQuestions, timestamp } = JSON.parse(saved);
          // Only restore if less than 24 hours old
          if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
            setTest(savedTest);
            setQuestions(savedQuestions);
          }
        } catch (e) {
          console.error('Failed to restore draft:', e);
        }
      }
    }
  }, [isNew]);

  const fetchTest = async () => {
    const { data: testData } = await supabase
      .from('tests')
      .select('*')
      .eq('id', testId)
      .single();

    if (!testData) {
      navigate('/admin/tests');
      return;
    }

    const td: any = testData;
    const toLocal = (iso?: string | null) => (iso ? iso.slice(0, 16) : '');
    const group = ((td.class_group as Test['class_group']) || 'single');

    // Fetch eligible classes from the mapping table
    const { data: ecRows } = await supabase
      .from('test_eligible_classes' as any)
      .select('class')
      .eq('test_id', testId!);
    const eligible = ((ecRows as any[]) || []).map((r: any) => r.class as string);

    setTest({
      id: testData.id,
      title: testData.title,
      description: testData.description || '',
      subject: testData.subject,
      class: testData.class,
      duration_minutes: testData.duration_minutes,
      is_published: testData.is_published,
      total_marks: testData.total_marks || 0,
      start_time: toLocal(td.start_time),
      end_time: toLocal(td.end_time),
      banner_image: td.banner_image || '',
      test_type: (td.test_type as Test['test_type']) || 'standard',
      prize_pool: td.prize_pool ?? null,
      prize_type: td.prize_type ?? null,
      prize_value: td.prize_value ?? null,
      prize_description: td.prize_description ?? null,
      class_group: group,
      eligible_classes: eligible,
    });

    const { data: questionsData } = await supabase
      .from('questions')
      .select('*')
      .eq('test_id', testId)
      .order('created_at', { ascending: true });

    if (questionsData) {
      setQuestions(questionsData.map(q => ({
        id: q.id,
        question_text: q.question_text,
        question_type: q.question_type as QuestionType,
        options: (q.options as string[]) || [],
        correct_answers: (q.correct_answers as number[]) || [],
        marks: q.marks,
      })));
    }

    setIsLoading(false);
  };

  const canAddQuestions = test.title && test.subject && test.class;

  const addQuestion = (type: QuestionType = 'mcq_single') => {
    const defaultMarks = getDefaultMarks(type);
    let options: string[] = ['', '', '', ''];
    
    if (type === 'true_false') {
      options = ['True', 'False'];
    } else if (['short_answer', 'long_answer'].includes(type)) {
      options = [];
    }
    
    const newQuestion: Question = {
      id: `temp-${Date.now()}`,
      question_text: '',
      question_type: type,
      options,
      correct_answers: [],
      marks: defaultMarks,
      isNew: true,
      isEditing: true,
    };
    setQuestions([...questions, newQuestion]);
    setExpandedCards(prev => new Set(prev).add(newQuestion.id));
  };

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    setQuestions(questions.map(q => 
      q.id === id ? { ...q, ...updates } : q
    ));
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
    setExpandedCards(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleQuestionTypeChange = (id: string, type: QuestionType) => {
    const question = questions.find(q => q.id === id);
    if (!question) return;

    let options = question.options;
    const newMarks = getDefaultMarks(type);
    
    if (type === 'true_false') {
      options = ['True', 'False'];
    } else if (['short_answer', 'long_answer'].includes(type)) {
      options = [];
    } else if (options.length === 0 || options.length === 2) {
      options = ['', '', '', ''];
    }
    
    updateQuestion(id, { question_type: type, options, correct_answers: [], marks: newMarks });
  };

  const saveTest = async (publish = false) => {
    if (!test.title || !test.subject || !test.class) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required test details.',
        variant: 'destructive',
      });
      return;
    }

    // Schedule validation (required when publishing)
    if (publish) {
      if (!test.start_time || !test.end_time) {
        toast({ title: 'Schedule required', description: 'Set both start and end time before publishing.', variant: 'destructive' });
        return;
      }
      if (new Date(test.end_time) <= new Date(test.start_time)) {
        toast({ title: 'Invalid schedule', description: 'End time must be after start time.', variant: 'destructive' });
        return;
      }
    }

    // Validate all questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question_text.trim()) {
        toast({
          title: 'Invalid Question',
          description: `Question ${i + 1} text is required.`,
          variant: 'destructive',
        });
        return;
      }
      if (['mcq_single', 'mcq_multiple'].includes(q.question_type)) {
        if (q.options.some(opt => !opt.trim())) {
          toast({
            title: 'Invalid Options',
            description: `All options in Question ${i + 1} must be filled.`,
            variant: 'destructive',
          });
          return;
        }
        if (q.correct_answers.length === 0) {
          toast({
            title: 'No Correct Answer',
            description: `Please select correct answer(s) for Question ${i + 1}.`,
            variant: 'destructive',
          });
          return;
        }
      }
      if (q.question_type === 'true_false' && q.correct_answers.length === 0) {
        toast({
          title: 'No Correct Answer',
          description: `Please select the correct answer for Question ${i + 1}.`,
          variant: 'destructive',
        });
        return;
      }
    }

    setIsSaving(true);

    try {
      let savedTestId = test.id;

      if (isNew || !test.id) {
        // Create new test
        const { data: newTest, error: testError } = await supabase
          .from('tests')
          .insert({
            title: test.title,
            description: test.description || null,
            subject: test.subject,
            class: test.class,
            duration_minutes: test.duration_minutes,
            is_published: publish,
            created_by: user?.id,
            start_time: test.start_time ? new Date(test.start_time).toISOString() : null,
            end_time: test.end_time ? new Date(test.end_time).toISOString() : null,
            banner_image: test.banner_image || null,
            test_type: test.test_type,
            prize_pool: test.prize_pool ?? null,
            prize_type: test.prize_type ?? null,
            prize_value: test.prize_value ?? null,
            prize_description: test.prize_description ?? null,
            class_group: test.class_group,
          } as any)
          .select()
          .single();

        if (testError) throw testError;
        savedTestId = newTest.id;
        setTest(prev => ({ ...prev, id: newTest.id }));
      } else {
        // Update existing test
        const { error: testError } = await supabase
          .from('tests')
          .update({
            title: test.title,
            description: test.description || null,
            subject: test.subject,
            class: test.class,
            duration_minutes: test.duration_minutes,
            is_published: publish,
            start_time: test.start_time ? new Date(test.start_time).toISOString() : null,
            end_time: test.end_time ? new Date(test.end_time).toISOString() : null,
            banner_image: test.banner_image || null,
            test_type: test.test_type,
            prize_pool: test.prize_pool ?? null,
            prize_type: test.prize_type ?? null,
            prize_value: test.prize_value ?? null,
            prize_description: test.prize_description ?? null,
            class_group: test.class_group,
          } as any)
          .eq('id', test.id);

        if (testError) throw testError;
      }

      // Sync eligible classes for 'custom' group (other groups handled by trigger)
      if (savedTestId && test.class_group === 'custom') {
        await supabase.from('test_eligible_classes' as any).delete().eq('test_id', savedTestId);
        if (test.eligible_classes.length > 0) {
          await supabase.from('test_eligible_classes' as any).insert(
            test.eligible_classes.map((c) => ({ test_id: savedTestId, class: c }))
          );
        }
      }

      // Handle questions
      const existingQuestionIds = questions.filter(q => !q.id.startsWith('temp-')).map(q => q.id);
      
      // Delete removed questions
      if (!isNew && savedTestId) {
        const { data: currentQuestions } = await supabase
          .from('questions')
          .select('id')
          .eq('test_id', savedTestId);
        
        if (currentQuestions) {
          const toDelete = currentQuestions.filter(q => !existingQuestionIds.includes(q.id));
          for (const q of toDelete) {
            await supabase.from('questions').delete().eq('id', q.id);
          }
        }
      }

      // Insert/update questions
      for (const q of questions) {
        const questionData = {
          test_id: savedTestId,
          question_text: q.question_text,
          question_type: q.question_type,
          options: q.options,
          correct_answers: q.correct_answers,
          correct_option_index: q.correct_answers[0] ?? 0,
          marks: q.marks,
        };

        if (q.id.startsWith('temp-')) {
          const { data: newQ, error } = await supabase
            .from('questions')
            .insert(questionData)
            .select()
            .single();
          
          if (error) throw error;
          
          // Update local state with real ID
          setQuestions(prev => prev.map(pq => 
            pq.id === q.id ? { ...pq, id: newQ.id, isNew: false, isEditing: false } : pq
          ));
        } else {
          const { error } = await supabase
            .from('questions')
            .update(questionData)
            .eq('id', q.id);
          
          if (error) throw error;
        }
      }

      // Clear localStorage after successful save
      localStorage.removeItem(`test-builder-${testId || 'new'}`);

      toast({
        title: publish ? 'Test Published!' : 'Test Saved',
        description: publish 
          ? 'Students can now see and attempt this test.' 
          : 'Your test has been saved as a draft.',
      });

      if (isNew) {
        navigate(`/admin/tests/${savedTestId}/builder`);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save test.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = () => {
    if (questions.length === 0) {
      toast({
        title: 'No Questions',
        description: 'Add at least one question before publishing.',
        variant: 'destructive',
      });
      return;
    }
    setShowPublishDialog(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);

  // Step gating
  const step1Complete = !!(test.title && test.subject && test.class && test.duration_minutes);
  const step2Complete = step1Complete && questions.length > 0;
  const scheduleValid = !!(test.start_time && test.end_time && new Date(test.end_time) > new Date(test.start_time));

  const goToStep = async (target: WizardStep) => {
    // Auto-save draft when moving past step 1 for the first time
    if (target > 1 && step === 1 && step1Complete && (isNew || !test.id)) {
      await saveTest(false);
    }
    setStep(target);
  };

  const StepHeader = (
    <div className="flex items-center gap-2 overflow-x-auto pb-2">
      {([1, 2, 3, 4] as WizardStep[]).map((n) => {
        const labels: Record<WizardStep, string> = { 1: 'Test Info', 2: 'Add Questions', 3: 'Review', 4: 'Publish' };
        const reachable = n === 1
          || (n === 2 && step1Complete)
          || (n === 3 && step2Complete)
          || (n === 4 && step2Complete);
        const active = step === n;
        return (
          <button
            key={n}
            type="button"
            onClick={() => reachable && goToStep(n)}
            disabled={!reachable}
            className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              active ? 'bg-primary text-primary-foreground shadow-sm'
              : reachable ? 'bg-muted text-foreground hover:bg-muted/80'
              : 'bg-muted/40 text-muted-foreground cursor-not-allowed'
            }`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
              active ? 'bg-primary-foreground/20' : 'bg-background/60'
            }`}>{n}</span>
            {labels[n]}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <Link to="/admin/tests">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-display font-bold text-foreground truncate">
            {isNew ? 'Create New Test' : 'Edit Test'}
          </h1>
          <p className="text-muted-foreground text-sm">
            Step {step} of 4 • {questions.length} question{questions.length !== 1 ? 's' : ''} • {totalMarks} marks
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => saveTest(false)} disabled={isSaving || !step1Complete}>
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Draft
          </Button>
        </div>
      </div>

      {StepHeader}

      {/* Step 1: Test Info */}
      {step === 1 && (
        <div className="dashboard-card">
          <h2 className="text-lg font-semibold text-foreground mb-4">Test Information</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="title">Test Name *</Label>
              <Input id="title" value={test.title} onChange={(e) => setTest({ ...test, title: e.target.value })} placeholder="e.g., Chapter 1 - Motion and Force" className="text-lg" />
            </div>

            {/* Audience selector */}
            <div className="space-y-3 md:col-span-2 rounded-xl border border-border bg-muted/30 p-4">
              <Label className="text-sm font-semibold">Audience *</Label>
              <RadioGroup
                value={test.class_group}
                onValueChange={(v) => setTest({ ...test, class_group: v as Test['class_group'] })}
                className="grid grid-cols-2 sm:grid-cols-4 gap-2"
              >
                {([
                  { v: 'single', label: 'Single class' },
                  { v: 'junior', label: 'Junior (6–7)' },
                  { v: 'senior', label: 'Senior (8–10)' },
                  { v: 'custom', label: 'Custom' },
                ] as const).map((opt) => (
                  <label
                    key={opt.v}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer text-sm transition ${
                      test.class_group === opt.v ? 'border-primary bg-primary/5 text-primary font-semibold' : 'border-border bg-background text-foreground'
                    }`}
                  >
                    <RadioGroupItem value={opt.v} />
                    {opt.label}
                  </label>
                ))}
              </RadioGroup>

              {test.class_group === 'junior' && (
                <p className="text-xs text-muted-foreground">Visible to <strong>Class 6 & 7</strong> students.</p>
              )}
              {test.class_group === 'senior' && (
                <p className="text-xs text-muted-foreground">Visible to <strong>Class 8, 9, 10</strong> students.</p>
              )}
              {test.class_group === 'custom' && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Pick the classes that should see this test:</p>
                  <div className="flex flex-wrap gap-2">
                    {CLASSES.map((c) => {
                      const selected = test.eligible_classes.includes(c);
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setTest({
                            ...test,
                            eligible_classes: selected
                              ? test.eligible_classes.filter((x) => x !== c)
                              : [...test.eligible_classes, c],
                          })}
                          className={`text-xs font-medium px-3 py-1.5 rounded-full border transition ${
                            selected ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-foreground border-border hover:bg-muted'
                          }`}
                        >
                          {c}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>{test.class_group === 'custom' || test.class_group === 'single' ? 'Class *' : 'Primary class *'}</Label>
              <ClassSelect value={test.class} onChange={(value) => setTest({ ...test, class: value })} disabled={!isNew && test.is_published} />
              {(test.class_group === 'junior' || test.class_group === 'senior') && (
                <p className="text-xs text-muted-foreground">Used as the test's primary class label; all eligible classes will see it.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Subject *</Label>
              <SubjectSelect value={test.subject} onChange={(value) => setTest({ ...test, subject: value })} disabled={!isNew && test.is_published} />
            </div>
            <div className="space-y-2">
              <Label>Test Type *</Label>
              <Select value={test.test_type} onValueChange={(v) => setTest({ ...test, test_type: v as Test['test_type'] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sunday_special">🔥 SSC Special Test</SelectItem>
                  <SelectItem value="weekly">📅 Weekly Test</SelectItem>
                  <SelectItem value="surprise_quiz">⚡ Surprise Quiz</SelectItem>
                  <SelectItem value="mock">📝 Mock Test</SelectItem>
                  <SelectItem value="standard">Standard Test</SelectItem>
                  <SelectItem value="practice">Practice Test</SelectItem>
                </SelectContent>
              </Select>
              {['sunday_special', 'weekly', 'surprise_quiz'].includes(test.test_type) && (
                <p className="text-xs text-amber-600">Highlighted on student dashboards when a banner image is added.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes) *</Label>
              <Input id="duration" type="number" min="5" max="180" value={test.duration_minutes} onChange={(e) => setTest({ ...test, duration_minutes: parseInt(e.target.value) || 30 })} />
            </div>
            <div className="space-y-2">
              <Label>Prize Type</Label>
              <Select
                value={test.prize_type ?? 'none'}
                onValueChange={(v) =>
                  setTest({
                    ...test,
                    prize_type: v === 'none' ? null : v,
                    prize_value: v === 'none' ? null : test.prize_value,
                    prize_pool: v === 'Money' ? test.prize_pool : null,
                  })
                }
              >
                <SelectTrigger><SelectValue placeholder="No prize" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No prize</SelectItem>
                  {PRIZE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t === 'Money' ? '💰 Money' : t === 'Gift' ? '🎁 Gift' : t === 'Book' ? '📚 Book' : t === 'Bag' ? '🎒 Bag' : t === 'Certificate' ? '🏅 Certificate' : '🏆 Other'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {test.prize_type && (
              <div className="space-y-2">
                <Label htmlFor="prize_value">
                  {test.prize_type === 'Money' ? 'Prize Amount (₹) *' : `${test.prize_type} Name / Value *`}
                </Label>
                <Input
                  id="prize_value"
                  type={test.prize_type === 'Money' ? 'number' : 'text'}
                  min={test.prize_type === 'Money' ? '0' : undefined}
                  step={test.prize_type === 'Money' ? '50' : undefined}
                  placeholder={test.prize_type === 'Money' ? '500' : 'e.g. School Bag, NCERT Set'}
                  value={
                    test.prize_type === 'Money'
                      ? (test.prize_pool ?? '')
                      : (test.prize_value ?? '')
                  }
                  onChange={(e) => {
                    const v = e.target.value.trim();
                    if (test.prize_type === 'Money') {
                      const amt = v === '' ? null : Math.max(0, parseInt(v) || 0);
                      setTest({
                        ...test,
                        prize_pool: amt,
                        prize_value: amt !== null ? `₹${amt}` : null,
                      });
                    } else {
                      setTest({ ...test, prize_value: v || null, prize_pool: null });
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground">Shown on banner & test card with a 🏆 badge.</p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="start_time">Start Time *</Label>
              <Input id="start_time" type="datetime-local" value={test.start_time} onChange={(e) => setTest({ ...test, start_time: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_time">End Time *</Label>
              <Input id="end_time" type="datetime-local" value={test.end_time} onChange={(e) => setTest({ ...test, end_time: e.target.value })} />
              {test.start_time && test.end_time && new Date(test.end_time) <= new Date(test.start_time) && (
                <p className="text-xs text-destructive">End time must be after start time.</p>
              )}
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Instructions (optional)</Label>
              <Textarea id="description" value={test.description || ''} onChange={(e) => setTest({ ...test, description: e.target.value })} placeholder="Special instructions for students..." rows={3} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Banner Image (optional, shows on student dashboard)</Label>
              <FileUploader
                bucket="banner-images"
                accept="image/*"
                maxSizeMB={5}
                isImage
                existingUrl={test.banner_image}
                onUploadComplete={(url) => setTest({ ...test, banner_image: url })}
              />
            </div>
          </div>
          <div className="flex justify-end mt-6">
            <Button onClick={() => goToStep(2)} disabled={!step1Complete || isSaving}>
              Next: Add Questions
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Questions */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-lg font-semibold text-foreground">Questions ({questions.length})</h2>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowBulkParser(true)} disabled={!canAddQuestions}>
                <Sparkles className="w-4 h-4 mr-2" />
                Bulk Add
              </Button>
              <Button onClick={() => addQuestion()} disabled={!canAddQuestions}>
                <Plus className="w-4 h-4 mr-2" />
                Add Question
              </Button>
            </div>
          </div>

          {questions.length === 0 && (
            <div className="dashboard-card text-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Questions Yet</h3>
              <p className="text-muted-foreground mb-4">Start building your test by adding questions.</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button variant="outline" onClick={() => setShowBulkParser(true)}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Paste from ChatGPT / Word
                </Button>
                <Button onClick={() => addQuestion()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Question Manually
                </Button>
              </div>
            </div>
          )}

          {questions.map((question, index) => (
            <QuestionCard
              key={question.id}
              question={question}
              index={index}
              isExpanded={expandedCards.has(question.id)}
              onToggle={() => toggleExpand(question.id)}
              onUpdate={(updates) => updateQuestion(question.id, updates)}
              onDelete={() => removeQuestion(question.id)}
              onTypeChange={(type) => handleQuestionTypeChange(question.id, type)}
            />
          ))}

          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={() => goToStep(1)}>Back</Button>
            <Button onClick={() => goToStep(3)} disabled={!step2Complete}>Next: Review</Button>
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="dashboard-card">
            <h2 className="text-lg font-semibold text-foreground mb-3">Review Your Test</h2>
            {test.banner_image && (
              <img src={test.banner_image} alt="" className="w-full rounded-xl mb-4 max-h-48 object-cover" />
            )}
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <dt className="text-muted-foreground">Title</dt><dd className="font-medium">{test.title}</dd>
              <dt className="text-muted-foreground">Class / Subject</dt><dd className="font-medium">Class {test.class} • {test.subject}</dd>
              <dt className="text-muted-foreground">Duration</dt><dd className="font-medium">{test.duration_minutes} min</dd>
              <dt className="text-muted-foreground">Questions</dt><dd className="font-medium">{questions.length} • {totalMarks} marks</dd>
              <dt className="text-muted-foreground">Start</dt><dd className="font-medium">{test.start_time ? new Date(test.start_time).toLocaleString() : '—'}</dd>
              <dt className="text-muted-foreground">End</dt><dd className="font-medium">{test.end_time ? new Date(test.end_time).toLocaleString() : '—'}</dd>
            </dl>
          </div>
          <div className="dashboard-card">
            <h3 className="font-semibold mb-3">Question summary</h3>
            <ul className="space-y-2 text-sm">
              {questions.map((q, i) => (
                <li key={q.id} className="flex items-start gap-2">
                  <span className="text-muted-foreground w-6">{i + 1}.</span>
                  <span className="flex-1">{q.question_text || <em className="text-muted-foreground">Untitled</em>}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">{q.marks}m</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => goToStep(2)}>Back</Button>
            <Button variant="outline" onClick={() => setShowPreview(true)}>
              <Eye className="w-4 h-4 mr-2" />Preview as student
            </Button>
            <Button onClick={() => goToStep(4)}>Next: Publish</Button>
          </div>
        </div>
      )}

      {/* Step 4: Publish */}
      {step === 4 && (
        <div className="dashboard-card text-center py-10">
          <Rocket className="w-12 h-12 text-primary mx-auto mb-3" />
          <h2 className="text-xl font-display font-bold mb-2">Ready to publish?</h2>
          <p className="text-muted-foreground mb-2">
            {questions.length} questions • {totalMarks} marks • Class {test.class}
          </p>
          {!scheduleValid && (
            <p className="text-sm text-destructive mb-4">Schedule is invalid. Go back to Step 1 and set a valid start/end time.</p>
          )}
          <div className="flex justify-center gap-3 mt-4">
            <Button variant="outline" onClick={() => goToStep(3)}>Back</Button>
            <Button onClick={() => saveTest(true)} disabled={isSaving || !scheduleValid}>
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Rocket className="w-4 h-4 mr-2" />}
              Publish Test
            </Button>
          </div>
        </div>
      )}

      {/* Publish Confirmation Dialog */}
      <AlertDialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish Test?</AlertDialogTitle>
            <AlertDialogDescription>
              This will make the test visible to all students in {test.class}. 
              {test.is_published && " The test is already published - this will update it."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => saveTest(true)}>
              Publish Test
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Preview Dialog */}
      {showPreview && questions.length > 0 && (
        <TestPreviewDialog
          test={test}
          questions={questions}
          onClose={() => setShowPreview(false)}
        />
      )}

      {/* Bulk Question Parser */}
      <BulkQuestionParser
        open={showBulkParser}
        onOpenChange={setShowBulkParser}
        onQuestionsAdd={handleBulkQuestionsAdd}
      />
    </div>
  );
}

// Question Card Component
interface QuestionCardProps {
  question: Question;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (updates: Partial<Question>) => void;
  onDelete: () => void;
  onTypeChange: (type: QuestionType) => void;
}

function QuestionCard({
  question,
  index,
  isExpanded,
  onToggle,
  onUpdate,
  onDelete,
  onTypeChange,
}: QuestionCardProps) {
  const updateOption = (optIndex: number, value: string) => {
    const newOptions = [...question.options];
    newOptions[optIndex] = value;
    onUpdate({ options: newOptions });
  };

  const addOption = () => {
    if (question.options.length < 6) {
      onUpdate({ options: [...question.options, ''] });
    }
  };

  const removeOption = (optIndex: number) => {
    if (question.options.length > 2) {
      const newOptions = question.options.filter((_, i) => i !== optIndex);
      const newCorrect = question.correct_answers
        .filter(i => i !== optIndex)
        .map(i => i > optIndex ? i - 1 : i);
      onUpdate({ options: newOptions, correct_answers: newCorrect });
    }
  };

  const toggleCorrectAnswer = (optIndex: number) => {
    if (question.question_type === 'mcq_single' || question.question_type === 'true_false') {
      onUpdate({ correct_answers: [optIndex] });
    } else {
      const newAnswers = question.correct_answers.includes(optIndex)
        ? question.correct_answers.filter(i => i !== optIndex)
        : [...question.correct_answers, optIndex];
      onUpdate({ correct_answers: newAnswers });
    }
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <div className="dashboard-card">
        <CollapsibleTrigger asChild>
          <div className="flex items-center gap-3 cursor-pointer">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-medium text-sm">
              {index + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-accent text-accent-foreground flex items-center gap-1">
                  {questionTypeIcons[question.question_type]}
                  {questionTypeLabels[question.question_type]}
                </span>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                  {question.marks} mark{question.marks !== 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-sm text-foreground truncate">
                {question.question_text || 'Untitled question'}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-destructive">
                <Trash2 className="w-4 h-4" />
              </Button>
              {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent className="pt-4 border-t mt-4 space-y-4">
          {/* Question Type & Marks */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Question Type</Label>
              <Select value={question.question_type} onValueChange={(v) => onTypeChange(v as QuestionType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(questionTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      <span className="flex items-center gap-2">
                        {questionTypeIcons[value as QuestionType]}
                        {label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Marks</Label>
              <Input
                type="number"
                min="1"
                max="100"
                value={question.marks}
                onChange={(e) => onUpdate({ marks: parseInt(e.target.value) || 1 })}
              />
            </div>
          </div>

          {/* Question Text */}
          <div className="space-y-2">
            <Label>Question Text *</Label>
            <Textarea
              value={question.question_text}
              onChange={(e) => onUpdate({ question_text: e.target.value })}
              placeholder="Enter your question here..."
              rows={3}
            />
          </div>

          {/* MCQ Options */}
          {['mcq_single', 'mcq_multiple'].includes(question.question_type) && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>
                  Options {question.question_type === 'mcq_multiple' && '(select all correct)'}
                </Label>
                {question.options.length < 6 && (
                  <Button variant="outline" size="sm" onClick={addOption}>
                    <Plus className="w-3 h-3 mr-1" />
                    Add Option
                  </Button>
                )}
              </div>
              
              {question.question_type === 'mcq_single' ? (
                <RadioGroup
                  value={question.correct_answers[0]?.toString() || ''}
                  onValueChange={(v) => onUpdate({ correct_answers: [parseInt(v)] })}
                >
                  {question.options.map((option, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <RadioGroupItem value={i.toString()} id={`${question.id}-opt-${i}`} />
                      <Input
                        value={option}
                        onChange={(e) => updateOption(i, e.target.value)}
                        placeholder={`Option ${i + 1}`}
                        className="flex-1"
                      />
                      {question.options.length > 2 && (
                        <Button variant="ghost" size="icon" onClick={() => removeOption(i)}>
                          <Trash2 className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      )}
                    </div>
                  ))}
                </RadioGroup>
              ) : (
                <div className="space-y-3">
                  {question.options.map((option, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Checkbox
                        checked={question.correct_answers.includes(i)}
                        onCheckedChange={() => toggleCorrectAnswer(i)}
                        id={`${question.id}-opt-${i}`}
                      />
                      <Input
                        value={option}
                        onChange={(e) => updateOption(i, e.target.value)}
                        placeholder={`Option ${i + 1}`}
                        className="flex-1"
                      />
                      {question.options.length > 2 && (
                        <Button variant="ghost" size="icon" onClick={() => removeOption(i)}>
                          <Trash2 className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* True/False Options */}
          {question.question_type === 'true_false' && (
            <div className="space-y-2">
              <Label>Correct Answer</Label>
              <RadioGroup
                value={question.correct_answers[0]?.toString() || ''}
                onValueChange={(v) => onUpdate({ correct_answers: [parseInt(v)] })}
              >
                <div className="flex items-center gap-4 p-3 rounded-lg border">
                  <RadioGroupItem value="0" id={`${question.id}-true`} />
                  <Label htmlFor={`${question.id}-true`} className="cursor-pointer">True</Label>
                </div>
                <div className="flex items-center gap-4 p-3 rounded-lg border">
                  <RadioGroupItem value="1" id={`${question.id}-false`} />
                  <Label htmlFor={`${question.id}-false`} className="cursor-pointer">False</Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Short/Long Answer Info */}
          {['short_answer', 'long_answer'].includes(question.question_type) && (
            <div className="bg-muted rounded-lg p-4 text-sm text-muted-foreground">
              {question.question_type === 'short_answer' 
                ? 'Students will write a short answer (2-3 lines). Requires manual evaluation.'
                : 'Students will write a detailed answer. Requires manual evaluation.'}
            </div>
          )}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

// Test Preview Dialog
interface TestPreviewDialogProps {
  test: Test;
  questions: Question[];
  onClose: () => void;
}

function TestPreviewDialog({ test, questions, onClose }: TestPreviewDialogProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentQuestion = questions[currentIndex];

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm overflow-y-auto">
      <div className="min-h-screen p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground">{test.title}</h2>
              <p className="text-sm text-muted-foreground">
                Preview • Q {currentIndex + 1} of {questions.length}
              </p>
            </div>
            <Button variant="outline" onClick={onClose}>
              Close Preview
            </Button>
          </div>

          {/* Question Preview */}
          <div className="dashboard-card mb-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-accent text-accent-foreground">
                {questionTypeLabels[currentQuestion.question_type]}
              </span>
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
                {currentQuestion.marks} mark{currentQuestion.marks !== 1 ? 's' : ''}
              </span>
            </div>
            
            <p className="text-lg font-medium text-foreground mb-6">
              {currentQuestion.question_text || 'Question text will appear here'}
            </p>

            {['mcq_single', 'mcq_multiple', 'true_false'].includes(currentQuestion.question_type) && (
              <div className="space-y-3">
                {currentQuestion.options.map((option, i) => (
                  <div
                    key={i}
                    className={`p-4 rounded-xl border-2 ${
                      currentQuestion.correct_answers.includes(i)
                        ? 'border-success bg-success/10'
                        : 'border-border'
                    }`}
                  >
                    {option || `Option ${i + 1}`}
                    {currentQuestion.correct_answers.includes(i) && (
                      <span className="ml-2 text-xs text-success">(Correct)</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {['short_answer', 'long_answer'].includes(currentQuestion.question_type) && (
              <div className="bg-muted rounded-xl p-4 text-muted-foreground text-sm">
                Students will type their answer here...
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
              disabled={currentIndex === 0}
            >
              Previous
            </Button>
            <div className="flex gap-2">
              {questions.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentIndex(i)}
                  className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                    i === currentIndex
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-accent text-accent-foreground hover:bg-accent/80'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              onClick={() => setCurrentIndex(Math.min(questions.length - 1, currentIndex + 1))}
              disabled={currentIndex === questions.length - 1}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
