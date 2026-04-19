import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ClipboardList, Plus, MoreVertical, Edit, Trash2, Clock, List, Loader2, Rocket, Trophy, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link, useNavigate } from 'react-router-dom';

interface Test {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  subject: string;
  class: string;
  is_published: boolean;
  total_marks: number | null;
  created_at: string;
  test_type: string;
  end_time: string | null;
  results_published_at: string | null;
  submission_count: number;
}

const TYPE_LABELS: Record<string, { label: string; className: string }> = {
  sunday_special: { label: '🔥 SSC Special', className: 'bg-amber-100 text-amber-800' },
  weekly: { label: '📅 Weekly', className: 'bg-blue-100 text-blue-800' },
  surprise_quiz: { label: '⚡ Surprise', className: 'bg-purple-100 text-purple-800' },
  mock: { label: '📝 Mock', className: 'bg-slate-100 text-slate-800' },
  standard: { label: 'Standard', className: 'bg-secondary text-secondary-foreground' },
  practice: { label: 'Practice', className: 'bg-emerald-100 text-emerald-800' },
};

export default function AdminTestsPage() {
  const [tests, setTests] = useState<Test[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [publishingResultsId, setPublishingResultsId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [justPublishedId, setJustPublishedId] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    const { data: testsData } = await supabase
      .from('tests')
      .select('*')
      .order('created_at', { ascending: false });

    if (!testsData) {
      setIsLoading(false);
      return;
    }

    // Fetch submission counts in one go
    const ids = testsData.map(t => t.id);
    const { data: attempts } = await supabase
      .from('test_attempts')
      .select('test_id, submitted_at')
      .in('test_id', ids);

    const counts: Record<string, number> = {};
    (attempts || []).forEach(a => {
      if (a.submitted_at) counts[a.test_id] = (counts[a.test_id] || 0) + 1;
    });

    setTests(testsData.map((t: any) => ({
      ...t,
      submission_count: counts[t.id] || 0,
    })));
    setIsLoading(false);
  };

  const deleteTest = async (id: string) => {
    const { error } = await supabase.from('tests').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: 'Failed to delete test.', variant: 'destructive' });
    } else {
      toast({ title: 'Deleted', description: 'Test deleted successfully.' });
      fetchTests();
    }
  };

  const togglePublish = async (test: Test) => {
    const nextPublished = !test.is_published;
    // Optimistic UI — flip the row immediately
    setTests((prev) => prev.map((t) => (t.id === test.id ? { ...t, is_published: nextPublished } : t)));
    setPublishingId(test.id);

    const { error } = await supabase
      .from('tests')
      .update({ is_published: nextPublished })
      .eq('id', test.id);

    if (error) {
      // Roll back optimistic flip
      setTests((prev) => prev.map((t) => (t.id === test.id ? { ...t, is_published: test.is_published } : t)));
      setPublishingId(null);
      toast({ title: 'Error', description: 'Failed to update test.', variant: 'destructive' });
      return;
    }

    setPublishingId(null);
    if (nextPublished) {
      setJustPublishedId(test.id);
      window.setTimeout(() => {
        setJustPublishedId((curr) => (curr === test.id ? null : curr));
      }, 1800);
    }
    toast({
      title: nextPublished ? '🚀 Published' : 'Unpublished',
      description: nextPublished
        ? 'Test is now live for students.'
        : 'Test is now a draft.',
    });
    // Refresh in background to pick up server-side side effects (banner sync, etc.)
    fetchTests();
  };

  const publishResults = async (test: Test) => {
    setPublishingResultsId(test.id);
    try {
      const { data, error } = await supabase.rpc('publish_test_results' as any, { p_test_id: test.id });
      if (error) throw error;
      const res: any = data;
      toast({
        title: 'Results Published 🏆',
        description: `${res?.winners_count ?? 0} winners announced. Visible to all students for 24h.`,
      });
      fetchTests();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to publish results.', variant: 'destructive' });
    } finally {
      setPublishingResultsId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Tests</h1>
          <p className="text-muted-foreground">Create and manage tests for students</p>
        </div>
        <Button onClick={() => navigate('/admin/tests/new/builder')}>
          <Plus className="w-4 h-4 mr-2" />
          Create Test
        </Button>
      </div>

      {tests.length === 0 ? (
        <div className="dashboard-card text-center py-12">
          <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Tests Yet</h3>
          <p className="text-muted-foreground mb-4">Create your first test to get started.</p>
          <Button onClick={() => navigate('/admin/tests/new/builder')}>
            <Plus className="w-4 h-4 mr-2" />
            Create First Test
          </Button>
        </div>
      ) : (
        <div className="dashboard-card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Submissions</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Results</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tests.map((test) => {
                  const typeInfo = TYPE_LABELS[test.test_type] || TYPE_LABELS.standard;
                  const hasEnded = test.end_time && new Date(test.end_time) < new Date();
                  const resultsPublished = !!test.results_published_at;
                  return (
                    <TableRow key={test.id}>
                      <TableCell className="font-medium">
                        <div>{test.title}</div>
                        <div className="text-xs text-muted-foreground">{test.subject}</div>
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${typeInfo.className}`}>
                          {typeInfo.label}
                        </span>
                      </TableCell>
                      <TableCell>{test.class}</TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1 text-muted-foreground text-sm">
                          <Clock className="w-3.5 h-3.5" />
                          {test.duration_minutes}m
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold">{test.submission_count}</span>
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => togglePublish(test)}
                          disabled={publishingId === test.id}
                          className={`text-xs font-medium px-2 py-1 rounded-full cursor-pointer transition-all inline-flex items-center gap-1 disabled:opacity-70 ${
                            test.is_published
                              ? 'bg-success/10 text-success hover:bg-success/20'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                          } ${justPublishedId === test.id ? 'animate-scale-in ring-2 ring-success/50' : ''}`}
                        >
                          {publishingId === test.id ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              {test.is_published ? 'Publishing…' : 'Updating…'}
                            </>
                          ) : justPublishedId === test.id ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              Published!
                            </>
                          ) : (
                            test.is_published ? 'Published' : 'Draft'
                          )}
                        </button>
                      </TableCell>
                      <TableCell>
                        {resultsPublished ? (
                          <span className="text-xs font-medium px-2 py-1 rounded-full bg-emerald-100 text-emerald-800 inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Published
                          </span>
                        ) : hasEnded && test.submission_count > 0 ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => publishResults(test)}
                            disabled={publishingResultsId === test.id}
                            className="h-7 text-xs"
                          >
                            {publishingResultsId === test.id ? (
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            ) : (
                              <Trophy className="w-3 h-3 mr-1" />
                            )}
                            Publish Results
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {hasEnded ? 'No submissions' : 'Pending'}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link to={`/admin/tests/${test.id}/builder`}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit Test
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link to={`/admin/tests/${test.id}/questions`}>
                                <List className="w-4 h-4 mr-2" />
                                Quick Edit Questions
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link to={`/admin/tests/${test.id}/results`}>
                                <Trophy className="w-4 h-4 mr-2" />
                                Results & Winners
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => togglePublish(test)}>
                              <Rocket className="w-4 h-4 mr-2" />
                              {test.is_published ? 'Unpublish' : 'Publish'}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => deleteTest(test.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
