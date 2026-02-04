import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ArrowLeft, Plus, Edit, Trash2, HelpCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Question {
  id: string;
  test_id: string;
  question_text: string;
  options: string[];
  correct_option_index: number;
}

interface Test {
  id: string;
  title: string;
}

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
    options: ['', '', '', ''],
    correct_option_index: 0,
  });

  useEffect(() => {
    if (testId) {
      fetchTestAndQuestions();
    }
  }, [testId]);

  const fetchTestAndQuestions = async () => {
    const { data: testData } = await supabase
      .from('tests')
      .select('id, title')
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
        options: q.options as string[]
      })));
    }

    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all options are filled
    if (formData.options.some((opt) => !opt.trim())) {
      toast({ title: 'Error', description: 'All options must be filled.', variant: 'destructive' });
      return;
    }

    if (editingQuestion) {
      const { error } = await supabase
        .from('questions')
        .update({
          question_text: formData.question_text,
          options: formData.options,
          correct_option_index: formData.correct_option_index,
        })
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
        question_text: formData.question_text,
        options: formData.options,
        correct_option_index: formData.correct_option_index,
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
      options: ['', '', '', ''],
      correct_option_index: 0,
    });
    setEditingQuestion(null);
    setIsDialogOpen(false);
  };

  const openEditDialog = (question: Question) => {
    setEditingQuestion(question);
    setFormData({
      question_text: question.question_text,
      options: question.options,
      correct_option_index: question.correct_option_index,
    });
    setIsDialogOpen(true);
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData({ ...formData, options: newOptions });
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
            {questions.length} question{questions.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Question
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingQuestion ? 'Edit Question' : 'Add New Question'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
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

              <div className="space-y-3">
                <Label>Options (select correct answer)</Label>
                <RadioGroup
                  value={formData.correct_option_index.toString()}
                  onValueChange={(value) =>
                    setFormData({ ...formData, correct_option_index: parseInt(value) })
                  }
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
              </div>

              <div className="flex gap-3">
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
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-medium">
                    {index + 1}
                  </span>
                  <p className="font-medium text-foreground pt-1">{question.question_text}</p>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-11">
                {question.options.map((option, optIndex) => (
                  <div
                    key={optIndex}
                    className={`px-4 py-2 rounded-lg text-sm ${
                      optIndex === question.correct_option_index
                        ? 'bg-success/10 text-success border border-success/20'
                        : 'bg-secondary text-secondary-foreground'
                    }`}
                  >
                    {option}
                    {optIndex === question.correct_option_index && (
                      <span className="ml-2 text-xs">✓ Correct</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
