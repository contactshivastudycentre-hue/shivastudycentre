import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { ClipboardList, Plus, MoreVertical, Edit, Trash2, Eye, Clock, List } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { Link } from 'react-router-dom';

interface Test {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  subject: string;
  class: string;
  is_published: boolean;
  created_at: string;
}

export default function AdminTestsPage() {
  const [tests, setTests] = useState<Test[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<Test | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    duration_minutes: 30,
    subject: '',
    class: '',
    is_published: false,
  });
  const { toast } = useToast();
  const { user } = useAuth();

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingTest) {
      const { error } = await supabase
        .from('tests')
        .update(formData)
        .eq('id', editingTest.id);

      if (error) {
        toast({ title: 'Error', description: 'Failed to update test.', variant: 'destructive' });
      } else {
        toast({ title: 'Success', description: 'Test updated successfully.' });
        fetchTests();
        resetForm();
      }
    } else {
      const { error } = await supabase
        .from('tests')
        .insert({ ...formData, created_by: user?.id });

      if (error) {
        toast({ title: 'Error', description: 'Failed to create test.', variant: 'destructive' });
      } else {
        toast({ title: 'Success', description: 'Test created successfully.' });
        fetchTests();
        resetForm();
      }
    }
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
      fetchTests();
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      duration_minutes: 30,
      subject: '',
      class: '',
      is_published: false,
    });
    setEditingTest(null);
    setIsDialogOpen(false);
  };

  const openEditDialog = (test: Test) => {
    setEditingTest(test);
    setFormData({
      title: test.title,
      description: test.description || '',
      duration_minutes: test.duration_minutes,
      subject: test.subject,
      class: test.class,
      is_published: test.is_published,
    });
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-muted-foreground">Loading tests...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Tests</h1>
          <p className="text-muted-foreground">Create and manage MCQ tests</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="w-4 h-4 mr-2" />
              Create Test
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingTest ? 'Edit Test' : 'Create New Test'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="class">Class</Label>
                  <Input
                    id="class"
                    value={formData.class}
                    onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="5"
                  max="180"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                  required
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="published">Published</Label>
                <Switch
                  id="published"
                  checked={formData.is_published}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })}
                />
              </div>
              <div className="flex gap-3">
                <Button type="submit" className="flex-1">
                  {editingTest ? 'Update Test' : 'Create Test'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {tests.length === 0 ? (
        <div className="dashboard-card text-center py-12">
          <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Tests Yet</h3>
          <p className="text-muted-foreground">Create your first test to get started.</p>
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
                    <TableCell>
                      <button
                        onClick={() => togglePublish(test)}
                        className={`text-xs font-medium px-2 py-1 rounded-full cursor-pointer ${
                          test.is_published ? 'status-approved' : 'status-inactive'
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
                            <Link to={`/admin/tests/${test.id}/questions`}>
                              <List className="w-4 h-4 mr-2" />
                              Manage Questions
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditDialog(test)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
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
