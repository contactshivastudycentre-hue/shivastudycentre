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
import { ClipboardList, Plus, MoreVertical, Edit, Trash2, Clock, List, Loader2, Rocket } from 'lucide-react';
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
}

export default function AdminTestsPage() {
  const [tests, setTests] = useState<Test[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    const { data } = await supabase
      .from('tests')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      setTests(data);
    }
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
    const { error } = await supabase
      .from('tests')
      .update({ is_published: !test.is_published })
      .eq('id', test.id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to update test.', variant: 'destructive' });
    } else {
      toast({
        title: test.is_published ? 'Unpublished' : 'Published',
        description: test.is_published ? 'Test is now a draft.' : 'Test is now live for students.',
      });
      fetchTests();
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
                  <TableHead>Subject</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Marks</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tests.map((test) => (
                  <TableRow key={test.id}>
                    <TableCell className="font-medium">{test.title}</TableCell>
                    <TableCell>{test.subject}</TableCell>
                    <TableCell>{test.class}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        {test.duration_minutes}m
                      </span>
                    </TableCell>
                    <TableCell>{test.total_marks || 0}</TableCell>
                    <TableCell>
                      <button
                        onClick={() => togglePublish(test)}
                        className={`text-xs font-medium px-2 py-1 rounded-full cursor-pointer transition-colors ${
                          test.is_published 
                            ? 'bg-success/10 text-success hover:bg-success/20' 
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        {test.is_published ? 'Published' : 'Draft'}
                      </button>
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
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
