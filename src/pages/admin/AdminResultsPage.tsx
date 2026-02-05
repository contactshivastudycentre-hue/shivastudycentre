import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  BarChart3, 
  Users, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Search,
  Eye,
  Loader2,
  FileText,
  ArrowLeft,
  Save
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ClassSelect } from '@/components/ClassSelect';
import { SubjectSelect } from '@/components/SubjectSelect';
import { format } from 'date-fns';

interface Test {
  id: string;
  title: string;
  subject: string;
  class: string;
  total_marks: number;
  duration_minutes: number;
}

interface TestAttempt {
  id: string;
  user_id: string;
  test_id: string;
  score: number | null;
  mcq_score: number | null;
  manual_score: number | null;
  answers: Record<string, { selected?: number[]; text?: string }>;
  started_at: string;
  submitted_at: string | null;
  evaluation_status: string | null;
  profile?: {
    full_name: string;
    class: string | null;
    mobile: string;
  };
}

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  options: string[];
  correct_answers: number[];
  marks: number;
}

export default function AdminResultsPage() {
  const { toast } = useToast();
  const [tests, setTests] = useState<Test[]>([]);
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  const [attempts, setAttempts] = useState<TestAttempt[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAttempts, setIsLoadingAttempts] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filters
  const [filterClass, setFilterClass] = useState('all');
  const [filterSubject, setFilterSubject] = useState('all');
  
  // Evaluation modal
  const [evaluatingAttempt, setEvaluatingAttempt] = useState<TestAttempt | null>(null);
  const [manualScores, setManualScores] = useState<Record<string, number>>({});
  const [isSavingEvaluation, setIsSavingEvaluation] = useState(false);

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    const { data } = await supabase
      .from('tests')
      .select('id, title, subject, class, total_marks, duration_minutes')
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (data) {
      setTests(data);
    }
    setIsLoading(false);
  };

  const fetchAttempts = async (test: Test) => {
    setIsLoadingAttempts(true);
    setSelectedTest(test);

    // Fetch attempts with profile data
    const { data: attemptsData } = await supabase
      .from('test_attempts')
      .select('*')
      .eq('test_id', test.id)
      .not('submitted_at', 'is', null)
      .order('submitted_at', { ascending: false });

    if (attemptsData) {
      // Fetch profiles for all users
      const userIds = attemptsData.map(a => a.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, class, mobile')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      
      const attemptsWithProfiles = attemptsData.map(attempt => ({
        ...attempt,
        answers: (attempt.answers as Record<string, { selected?: number[]; text?: string }>) || {},
        profile: profileMap.get(attempt.user_id),
      }));

      setAttempts(attemptsWithProfiles);
    }

    // Fetch questions for evaluation
    const { data: questionsData } = await supabase
      .from('questions')
      .select('*')
      .eq('test_id', test.id);

    if (questionsData) {
      setQuestions(questionsData.map(q => ({
        id: q.id,
        question_text: q.question_text,
        question_type: q.question_type,
        options: (q.options as string[]) || [],
        correct_answers: (q.correct_answers as number[]) || [],
        marks: q.marks,
      })));
    }

    setIsLoadingAttempts(false);
  };

  const openEvaluationModal = (attempt: TestAttempt) => {
    setEvaluatingAttempt(attempt);
    // Initialize scores from existing evaluation
    const scores: Record<string, number> = {};
    questions.forEach(q => {
      if (['short_answer', 'long_answer'].includes(q.question_type)) {
        // Try to get existing score or default to 0
        scores[q.id] = 0;
      }
    });
    setManualScores(scores);
  };

  const saveEvaluation = async () => {
    if (!evaluatingAttempt) return;
    
    setIsSavingEvaluation(true);

    // Calculate total manual score
    const totalManualScore = Object.values(manualScores).reduce((sum, s) => sum + s, 0);
    
    // Calculate final score percentage
    const mcqScore = evaluatingAttempt.mcq_score || 0;
    const totalScore = mcqScore + totalManualScore;
    const totalMarks = selectedTest?.total_marks || 0;
    const percentage = totalMarks > 0 ? Math.round((totalScore / totalMarks) * 100) : 0;

    const { error } = await supabase
      .from('test_attempts')
      .update({
        manual_score: totalManualScore,
        score: percentage,
        evaluation_status: 'completed',
        evaluated_at: new Date().toISOString(),
      })
      .eq('id', evaluatingAttempt.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to save evaluation.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Evaluation Saved',
        description: `Final score: ${percentage}%`,
      });
      
      // Refresh attempts
      if (selectedTest) {
        fetchAttempts(selectedTest);
      }
      setEvaluatingAttempt(null);
    }

    setIsSavingEvaluation(false);
  };

  // Filter tests
  const filteredTests = tests.filter(test => {
    if (filterClass !== 'all' && test.class !== filterClass) return false;
    if (filterSubject !== 'all' && test.subject !== filterSubject) return false;
    return true;
  });

  // Filter attempts by search
  const filteredAttempts = attempts.filter(attempt => {
    if (!searchQuery) return true;
    const name = attempt.profile?.full_name?.toLowerCase() || '';
    const mobile = attempt.profile?.mobile || '';
    return name.includes(searchQuery.toLowerCase()) || mobile.includes(searchQuery);
  });

  // Stats
  const totalAttempts = filteredAttempts.length;
  const completedEvaluations = filteredAttempts.filter(a => a.evaluation_status === 'completed').length;
  const pendingEvaluations = filteredAttempts.filter(a => a.evaluation_status === 'pending').length;
  const avgScore = totalAttempts > 0 
    ? Math.round(filteredAttempts.reduce((sum, a) => sum + (a.score || 0), 0) / totalAttempts)
    : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // View: Selected test results
  if (selectedTest) {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-4 flex-wrap">
          <Button variant="ghost" size="icon" onClick={() => setSelectedTest(null)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-display font-bold text-foreground">{selectedTest.title}</h1>
            <p className="text-muted-foreground">
              {selectedTest.subject} • {selectedTest.class} • {selectedTest.total_marks} marks
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="dashboard-card text-center">
            <Users className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{totalAttempts}</p>
            <p className="text-xs text-muted-foreground">Total Attempts</p>
          </div>
          <div className="dashboard-card text-center">
            <BarChart3 className="w-6 h-6 text-success mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{avgScore}%</p>
            <p className="text-xs text-muted-foreground">Average Score</p>
          </div>
          <div className="dashboard-card text-center">
            <CheckCircle className="w-6 h-6 text-success mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{completedEvaluations}</p>
            <p className="text-xs text-muted-foreground">Evaluated</p>
          </div>
          <div className="dashboard-card text-center">
            <AlertCircle className="w-6 h-6 text-warning mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{pendingEvaluations}</p>
            <p className="text-xs text-muted-foreground">Pending Review</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or mobile..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Results Table */}
        {isLoadingAttempts ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : filteredAttempts.length === 0 ? (
          <div className="dashboard-card text-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Submissions Yet</h3>
            <p className="text-muted-foreground">Students haven't submitted this test yet.</p>
          </div>
        ) : (
          <div className="dashboard-card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>MCQ Score</TableHead>
                    <TableHead>Manual Score</TableHead>
                    <TableHead>Final %</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAttempts.map((attempt) => {
                    const hasDescriptive = questions.some(q => 
                      ['short_answer', 'long_answer'].includes(q.question_type)
                    );

                    return (
                      <TableRow key={attempt.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{attempt.profile?.full_name || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">{attempt.profile?.mobile}</p>
                          </div>
                        </TableCell>
                        <TableCell>{attempt.profile?.class || '-'}</TableCell>
                        <TableCell>
                          {attempt.submitted_at 
                            ? format(new Date(attempt.submitted_at), 'dd MMM, HH:mm')
                            : '-'
                          }
                        </TableCell>
                        <TableCell>{attempt.mcq_score || 0}</TableCell>
                        <TableCell>{attempt.manual_score ?? '-'}</TableCell>
                        <TableCell>
                          <span className="font-semibold">{attempt.score || 0}%</span>
                        </TableCell>
                        <TableCell>
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                            attempt.evaluation_status === 'completed'
                              ? 'bg-success/10 text-success'
                              : 'bg-warning/10 text-warning'
                          }`}>
                            {attempt.evaluation_status === 'completed' ? 'Evaluated' : 'Pending'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {hasDescriptive && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => openEvaluationModal(attempt)}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              {attempt.evaluation_status === 'completed' ? 'View' : 'Evaluate'}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Evaluation Modal */}
        <Dialog open={!!evaluatingAttempt} onOpenChange={() => setEvaluatingAttempt(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>
                Evaluate Submission - {evaluatingAttempt?.profile?.full_name}
              </DialogTitle>
            </DialogHeader>
            
            <div className="flex-1 overflow-y-auto space-y-6 py-4">
              {questions.filter(q => ['short_answer', 'long_answer'].includes(q.question_type)).map((question, index) => {
                const answer = evaluatingAttempt?.answers[question.id];
                
                return (
                  <div key={question.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-accent text-accent-foreground">
                          Q{index + 1} • {question.marks} marks
                        </span>
                        <p className="mt-2 font-medium text-foreground">{question.question_text}</p>
                      </div>
                    </div>
                    
                    <div className="bg-accent/30 rounded-lg p-3">
                      <Label className="text-xs text-muted-foreground">Student's Answer</Label>
                      <p className="mt-1 text-foreground whitespace-pre-wrap">
                        {answer?.text || <span className="text-muted-foreground italic">No answer provided</span>}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <Label className="text-sm">Score (out of {question.marks}):</Label>
                      <Input
                        type="number"
                        min={0}
                        max={question.marks}
                        value={manualScores[question.id] || 0}
                        onChange={(e) => {
                          const value = Math.min(question.marks, Math.max(0, parseInt(e.target.value) || 0));
                          setManualScores(prev => ({ ...prev, [question.id]: value }));
                        }}
                        className="w-20 h-9"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <DialogFooter className="border-t pt-4">
              <Button variant="outline" onClick={() => setEvaluatingAttempt(null)}>
                Cancel
              </Button>
              <Button onClick={saveEvaluation} disabled={isSavingEvaluation}>
                {isSavingEvaluation ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Evaluation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // View: Test list
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Test Results</h1>
        <p className="text-muted-foreground">View and evaluate student submissions</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="w-40">
          <Select value={filterClass} onValueChange={setFilterClass}>
            <SelectTrigger>
              <SelectValue placeholder="All Classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {['Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'].map((cls) => (
                <SelectItem key={cls} value={cls}>{cls}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-40">
          <Select value={filterSubject} onValueChange={setFilterSubject}>
            <SelectTrigger>
              <SelectValue placeholder="All Subjects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {['Science', 'Math', 'English', 'SST', 'Hindi', 'Other'].map((sub) => (
                <SelectItem key={sub} value={sub}>{sub}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Test Cards */}
      {filteredTests.length === 0 ? (
        <div className="dashboard-card text-center py-12">
          <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Published Tests</h3>
          <p className="text-muted-foreground">Publish tests to see student results here.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTests.map((test) => (
            <div 
              key={test.id} 
              className="dashboard-card cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fetchAttempts(test)}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-accent text-accent-foreground">
                  {test.subject}
                </span>
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
                  {test.class}
                </span>
              </div>
              <h3 className="font-semibold text-foreground mb-2">{test.title}</h3>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {test.duration_minutes}m
                </span>
                <span>{test.total_marks} marks</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
