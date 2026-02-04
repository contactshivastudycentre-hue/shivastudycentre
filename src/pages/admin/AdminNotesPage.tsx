import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { FileText, Plus, MoreVertical, Edit, Trash2, ExternalLink, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ClassSelect } from '@/components/ClassSelect';
import { SubjectSelect } from '@/components/SubjectSelect';
import { useAuth } from '@/lib/auth';
import { FileUploader } from '@/components/admin/FileUploader';

interface Note {
  id: string;
  title: string;
  subject: string;
  class: string;
  pdf_url: string;
  created_at: string;
}

export default function AdminNotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    class: '',
    pdf_url: '',
  });
  const [uploadMode, setUploadMode] = useState<'file' | 'url'>('file');
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    const { data } = await supabase
      .from('notes')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      setNotes(data);
    }
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.pdf_url) {
      toast({ title: 'Error', description: 'Please upload a PDF file or enter a URL.', variant: 'destructive' });
      return;
    }

    if (editingNote) {
      const { error } = await supabase
        .from('notes')
        .update(formData)
        .eq('id', editingNote.id);

      if (error) {
        toast({ title: 'Error', description: 'Failed to update note.', variant: 'destructive' });
      } else {
        toast({ title: 'Success', description: 'Note updated successfully.' });
        fetchNotes();
        resetForm();
      }
    } else {
      const { error } = await supabase
        .from('notes')
        .insert({ ...formData, created_by: user?.id });

      if (error) {
        toast({ title: 'Error', description: 'Failed to add note.', variant: 'destructive' });
      } else {
        toast({ title: 'Success', description: 'Note added successfully.' });
        fetchNotes();
        resetForm();
      }
    }
  };

  const deleteNote = async (id: string) => {
    const { error } = await supabase.from('notes').delete().eq('id', id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to delete note.', variant: 'destructive' });
    } else {
      toast({ title: 'Deleted', description: 'Note deleted successfully.' });
      fetchNotes();
    }
  };

  const resetForm = () => {
    setFormData({ title: '', subject: '', class: '', pdf_url: '' });
    setEditingNote(null);
    setIsDialogOpen(false);
    setUploadMode('file');
  };

  const openEditDialog = (note: Note) => {
    setEditingNote(note);
    setFormData({
      title: note.title,
      subject: note.subject,
      class: note.class,
      pdf_url: note.pdf_url,
    });
    setUploadMode('url'); // Show existing URL when editing
    setIsDialogOpen(true);
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
          <h1 className="text-2xl font-display font-bold text-foreground">Notes</h1>
          <p className="text-muted-foreground">Manage study materials and PDFs</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Note
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingNote ? 'Edit Note' : 'Add New Note'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title / Chapter Name</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Chapter 1 - Motion and Force"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <SubjectSelect
                    value={formData.subject}
                    onChange={(value) => setFormData({ ...formData, subject: value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Class</Label>
                  <ClassSelect
                    value={formData.class}
                    onChange={(value) => setFormData({ ...formData, class: value })}
                    required
                  />
                </div>
              </div>
              
              {/* Upload Mode Toggle */}
              <div className="space-y-2">
                <Label>PDF Source</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={uploadMode === 'file' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setUploadMode('file')}
                  >
                    Upload File
                  </Button>
                  <Button
                    type="button"
                    variant={uploadMode === 'url' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setUploadMode('url')}
                  >
                    Enter URL
                  </Button>
                </div>
              </div>

              {/* File Upload */}
              {uploadMode === 'file' && (
                <FileUploader
                  bucket="notes"
                  accept=".pdf"
                  maxSizeMB={10}
                  onUploadComplete={(url) => setFormData({ ...formData, pdf_url: url })}
                  existingUrl={formData.pdf_url}
                />
              )}

              {/* URL Input */}
              {uploadMode === 'url' && (
                <div className="space-y-2">
                  <Label htmlFor="pdf_url">PDF URL</Label>
                  <Input
                    id="pdf_url"
                    type="url"
                    value={formData.pdf_url}
                    onChange={(e) => setFormData({ ...formData, pdf_url: e.target.value })}
                    placeholder="https://drive.google.com/file/d/..."
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Use Google Drive share link or any direct PDF URL
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button type="submit" className="flex-1" disabled={!formData.pdf_url}>
                  {editingNote ? 'Update Note' : 'Add Note'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {notes.length === 0 ? (
        <div className="dashboard-card text-center py-12">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Notes Yet</h3>
          <p className="text-muted-foreground">Add study materials for students.</p>
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
                  <TableHead>Added</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notes.map((note) => (
                  <TableRow key={note.id}>
                    <TableCell className="font-medium">{note.title}</TableCell>
                    <TableCell>{note.subject}</TableCell>
                    <TableCell>{note.class}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(note.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => window.open(note.pdf_url, '_blank')}>
                            <ExternalLink className="w-4 h-4 mr-2" />
                            View PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditDialog(note)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => deleteNote(note.id)}
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
