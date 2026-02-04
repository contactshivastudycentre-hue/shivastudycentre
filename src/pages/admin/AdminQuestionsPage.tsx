import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Plus, Edit, Trash2, HelpCircle, CheckCircle, FileText, AlignLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type QuestionType = 'mcq_single' | 'mcq_multiple' | 'true_false' | 'short_answer' | 'long_answer';

interface Question {
  id: string;
  test_id: string;
  question_text: string;
  question_type: QuestionType;
  options: string[];
  correct_option_index: number;
  correct_answers: number[];
  marks: number;
}

interface Test {
  id: string;
  title: string;
  total_marks: number;
}

const questionTypeLabels: Record<QuestionType, string> = {
  mcq_single: 'MCQ (Single Correct)',
  mcq_multiple: 'MCQ (Multiple Correct)',
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

export default function AdminQuestionsPage() {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [formData, setFormData] = useState({
    question_text: '',
    question_type: 'mcq_single' as QuestionType,
    options: ['', '', '', ''],
    correct_answers: [] as number[],
    marks: 1,
  });

  useEffect(() => {
    if (testId) {
      fetchTestAndQuestions();
    }
  }, [testId]);

  const fetchTestAndQuestions = async () => {
    const { data: testData } = await supabase
      .from('tests')
      .select('id, title, total_marks')
      .eq('id', testId)
      .single();

    if (!testData) {
      navigate('/admin/tests');
      return;
    }

    setTest(testData);

    const { data: questionsData } = await supabase
      .from('questions')
      .select('*')
      .eq('test_id', testId)
      .order('created_at', { ascending: true });

    if (questionsData) {
      setQuestions(questionsData.map(q => ({
        ...q,
        options: (q.options as string[]) || [],
        correct_answers: (q.correct_answers as number[]) || [],
        question_type: (q.question_type as QuestionType) || 'mcq_single',
      })));
    }

    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate based on question type
    if (['mcq_single', 'mcq_multiple'].includes(formData.question_type)) {
      if (formData.options.some((opt) => !opt.trim())) {
        toast({ title: 'Error', description: 'All options must be filled.', variant: 'destructive' });
        return;
      }
      if (formData.correct_answers.length === 0) {
        toast({ title: 'Error', description: 'Please select correct answer(s).', variant: 'destructive' });
        return;
      }
    }

    if (formData.question_type === 'true_false' && formData.correct_answers.length === 0) {
      toast({ title: 'Error', description: 'Please select the correct answer.', variant: 'destructive' });
      return;
    }

    const questionData = {
      question_text: formData.question_text,
      question_type: formData.question_type,
      options: ['mcq_single', 'mcq_multiple'].includes(formData.question_type) 
        ? formData.options 
        : formData.question_type === 'true_false' 
          ? ['True', 'False'] 
          : [],
      correct_answers: formData.correct_answers,
      correct_option_index: formData.correct_answers[0] ?? 0,
      marks: formData.marks,
    };

    if (editingQuestion) {
      const { error } = await supabase
        .from('questions')
        .update(questionData)
        .eq('id', editingQuestion.id);

      if (error) {
        toast({ title: 'Error', description: 'Failed to update question.', variant: 'destructive' });
      } else {
        toast({ title: 'Success', description: 'Question updated successfully.' });
        fetchTestAndQuestions();
        resetForm();
      }
    } else {
      const { error } = await supabase.from('questions').insert({
        test_id: testId,
        ...questionData,
      });

      if (error) {
        toast({ title: 'Error', description: 'Failed to add question.', variant: 'destructive' });
      } else {
        toast({ title: 'Success', description: 'Question added successfully.' });
        fetchTestAndQuestions();
        resetForm();
      }
    }
  };

  const deleteQuestion = async (id: string) => {
    const { error } = await supabase.from('questions').delete().eq('id', id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to delete question.', variant: 'destructive' });
    } else {
      toast({ title: 'Deleted', description: 'Question deleted successfully.' });
      fetchTestAndQuestions();
    }
  };

  const resetForm = () => {
    setFormData({
      question_text: '',
      question_type: 'mcq_single',
      options: ['', '', '', ''],
      correct_answers: [],
      marks: 1,
    });
    setEditingQuestion(null);
    setIsDialogOpen(false);
  };

  const openEditDialog = (question: Question) => {
    setEditingQuestion(question);
    setFormData({
      question_text: question.question_text,
      question_type: question.question_type,
      options: question.options.length > 0 ? question.options : ['', '', '', ''],
      correct_answers: question.correct_answers,
      marks: question.marks,
    });
    setIsDialogOpen(true);
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData({ ...formData, options: newOptions });
  };

  const toggleCorrectAnswer = (index: number) => {
    if (formData.question_type === 'mcq_single' || formData.question_type === 'true_false') {
      setFormData({ ...formData, correct_answers: [index] });
    } else {
      const newAnswers = formData.correct_answers.includes(index)
        ? formData.correct_answers.filter(a => a !== index)
        : [...formData.correct_answers, index];
      setFormData({ ...formData, correct_answers: newAnswers });
    }
  };

  const handleTypeChange = (type: QuestionType) => {
    let options = formData.options;
    let correct_answers: number[] = [];
    
    if (type === 'true_false') {
      options = ['True', 'False'];
    } else if (['short_answer', 'long_answer'].includes(type)) {
      options = [];
    } else if (options.length === 0 || options.length === 2) {
      options = ['', '', '', ''];
    }
    
    setFormData({ ...formData, question_type: type, options, correct_answers });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-muted-foreground">Loading questions...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Link to="/admin/tests">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-display font-bold text-foreground">
            {test?.title}
          </h1>
          <p className="text-muted-foreground">
            {questions.length} question{questions.length !== 1 ? 's' : ''} • Total: {test?.total_marks || 0} marks
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Question
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingQuestion ? 'Edit Question' : 'Add New Question'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Question Type */}
              <div className="space-y-2">
                <Label>Question Type</Label>
                <Select
                  value={formData.question_type}
                  onValueChange={(value) => handleTypeChange(value as QuestionType)}
                >
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

              {/* Marks */}
              <div className="space-y-2">
                <Label htmlFor="marks">Marks</Label>
                <Input
                  id="marks"
                  type="number"
                  min="1"
                  max="100"
                  value={formData.marks}
                  onChange={(e) => setFormData({ ...formData, marks: parseInt(e.target.value) || 1 })}
                  required
                />
              </div>

              {/* Question Text */}
              <div className="space-y-2">
                <Label htmlFor="question">Question</Label>
                <Textarea
                  id="question"
                  value={formData.question_text}
                  onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
                  rows={3}
                  required
                />
              </div>

              {/* MCQ Options */}
              {['mcq_single', 'mcq_multiple'].includes(formData.question_type) && (
                <div className="space-y-3">
                  <Label>
                    Options {formData.question_type === 'mcq_multiple' && '(select all correct)'}
                  </Label>
                  {formData.question_type === 'mcq_single' ? (
                    <RadioGroup
                      value={formData.correct_answers[0]?.toString() || ''}
                      onValueChange={(value) => setFormData({ ...formData, correct_answers: [parseInt(value)] })}
                    >
                      {formData.options.map((option, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                          <Input
                            value={option}
                            onChange={(e) => updateOption(index, e.target.value)}
                            placeholder={`Option ${index + 1}`}
                            className="flex-1"
                            required
                          />
                        </div>
                      ))}
                    </RadioGroup>
                  ) : (
                    <div className="space-y-3">
                      {formData.options.map((option, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <Checkbox
                            checked={formData.correct_answers.includes(index)}
                            onCheckedChange={() => toggleCorrectAnswer(index)}
                            id={`option-${index}`}
                          />
                          <Input
                            value={option}
                            onChange={(e) => updateOption(index, e.target.value)}
                            placeholder={`Option ${index + 1}`}
                            className="flex-1"
                            required
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* True/False Options */}
              {formData.question_type === 'true_false' && (
                <div className="space-y-3">
                  <Label>Correct Answer</Label>
                  <RadioGroup
                    value={formData.correct_answers[0]?.toString() || ''}
                    onValueChange={(value) => setFormData({ ...formData, correct_answers: [parseInt(value)] })}
                  >
                    <div className="flex items-center gap-3 p-3 rounded-lg border">
                      <RadioGroupItem value="0" id="true" />
                      <Label htmlFor="true" className="cursor-pointer flex-1">True</Label>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg border">
                      <RadioGroupItem value="1" id="false" />
                      <Label htmlFor="false" className="cursor-pointer flex-1">False</Label>
                    </div>
                  </RadioGroup>
                </div>
              )}

              {/* Short/Long Answer Info */}
              {['short_answer', 'long_answer'].includes(formData.question_type) && (
                <div className="bg-muted rounded-lg p-4 text-sm text-muted-foreground">
                  <p>
                    {formData.question_type === 'short_answer' 
                      ? 'Students will provide a short text answer (2-3 lines). This will require manual evaluation.'
                      : 'Students will provide a detailed answer. This will require manual evaluation.'}
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button type="submit" className="flex-1">
                  {editingQuestion ? 'Update Question' : 'Add Question'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {questions.length === 0 ? (
        <div className="dashboard-card text-center py-12">
          <HelpCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Questions Yet</h3>
          <p className="text-muted-foreground">Add questions to this test.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((question, index) => (
            <div key={question.id} className="dashboard-card">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-medium text-sm">
                    {index + 1}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-accent text-accent-foreground">
                        {questionTypeLabels[question.question_type]}
                      </span>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                        {question.marks} mark{question.marks !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <p className="font-medium text-foreground">{question.question_text}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(question)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteQuestion(question.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              {/* Show options for MCQ/True-False */}
              {['mcq_single', 'mcq_multiple', 'true_false'].includes(question.question_type) && question.options.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-11">
                  {question.options.map((option, optIndex) => (
                    <div
                      key={optIndex}
                      className={`px-4 py-2 rounded-lg text-sm ${
                        question.correct_answers.includes(optIndex)
                          ? 'bg-success/10 text-success border border-success/20'
                          : 'bg-secondary text-secondary-foreground'
                      }`}
                    >
                      {option}
                      {question.correct_answers.includes(optIndex) && (
                        <span className="ml-2 text-xs">✓</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              {/* Info for descriptive questions */}
              {['short_answer', 'long_answer'].includes(question.question_type) && (
                <div className="pl-11">
                  <span className="text-xs text-muted-foreground italic">
                    Requires manual evaluation
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
