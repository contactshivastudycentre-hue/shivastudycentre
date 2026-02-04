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
import { Play, Plus, MoreVertical, Edit, Trash2, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';

interface Video {
  id: string;
  title: string;
  subject: string;
  class: string;
  video_url: string;
  thumbnail_url: string | null;
  created_at: string;
}

export default function AdminVideosPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    class: '',
    video_url: '',
    thumbnail_url: '',
  });
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    const { data } = await supabase
      .from('videos')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      setVideos(data);
    }
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      title: formData.title,
      subject: formData.subject,
      class: formData.class,
      video_url: formData.video_url,
      thumbnail_url: formData.thumbnail_url || null,
    };

    if (editingVideo) {
      const { error } = await supabase
        .from('videos')
        .update(payload)
        .eq('id', editingVideo.id);

      if (error) {
        toast({ title: 'Error', description: 'Failed to update video.', variant: 'destructive' });
      } else {
        toast({ title: 'Success', description: 'Video updated successfully.' });
        fetchVideos();
        resetForm();
      }
    } else {
      const { error } = await supabase
        .from('videos')
        .insert({ ...payload, created_by: user?.id });

      if (error) {
        toast({ title: 'Error', description: 'Failed to add video.', variant: 'destructive' });
      } else {
        toast({ title: 'Success', description: 'Video added successfully.' });
        fetchVideos();
        resetForm();
      }
    }
  };

  const deleteVideo = async (id: string) => {
    const { error } = await supabase.from('videos').delete().eq('id', id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to delete video.', variant: 'destructive' });
    } else {
      toast({ title: 'Deleted', description: 'Video deleted successfully.' });
      fetchVideos();
    }
  };

  const resetForm = () => {
    setFormData({ title: '', subject: '', class: '', video_url: '', thumbnail_url: '' });
    setEditingVideo(null);
    setIsDialogOpen(false);
  };

  const openEditDialog = (video: Video) => {
    setEditingVideo(video);
    setFormData({
      title: video.title,
      subject: video.subject,
      class: video.class,
      video_url: video.video_url,
      thumbnail_url: video.thumbnail_url || '',
    });
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-muted-foreground">Loading videos...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Videos</h1>
          <p className="text-muted-foreground">Manage video lectures and tutorials</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Video
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingVideo ? 'Edit Video' : 'Add New Video'}</DialogTitle>
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
                <Label htmlFor="video_url">Video URL (YouTube or embed link)</Label>
                <Input
                  id="video_url"
                  type="url"
                  value={formData.video_url}
                  onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                  placeholder="https://youtube.com/watch?v=..."
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="thumbnail_url">Thumbnail URL (Optional)</Label>
                <Input
                  id="thumbnail_url"
                  type="url"
                  value={formData.thumbnail_url}
                  onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="flex gap-3">
                <Button type="submit" className="flex-1">
                  {editingVideo ? 'Update Video' : 'Add Video'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {videos.length === 0 ? (
        <div className="dashboard-card text-center py-12">
          <Play className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Videos Yet</h3>
          <p className="text-muted-foreground">Add video lectures for students.</p>
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
                {videos.map((video) => (
                  <TableRow key={video.id}>
                    <TableCell className="font-medium">{video.title}</TableCell>
                    <TableCell>{video.subject}</TableCell>
                    <TableCell>{video.class}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(video.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => window.open(video.video_url, '_blank')}>
                            <ExternalLink className="w-4 h-4 mr-2" />
                            View Video
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditDialog(video)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => deleteVideo(video.id)}
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
