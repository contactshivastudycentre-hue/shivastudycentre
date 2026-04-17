import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Image as ImageIcon } from 'lucide-react';
import { FileUploader } from '@/components/admin/FileUploader';

const CLASSES = ['4', '5', '6', '7', '8', '9', '10', '11', '12'];
const NONE = '__none__';

export default function AdminBannersPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({
    title: '', description: '', image_url: '', target_class: NONE,
    is_universal: false, event_id: NONE, is_active: true, priority: 0,
  });

  const { data: banners, isLoading } = useQuery({
    queryKey: ['admin-banners'],
    queryFn: async () => {
      const { data, error } = await supabase.from('banners').select('*, test_events(event_name)').order('priority', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: events } = useQuery({
    queryKey: ['admin-events-list'],
    queryFn: async () => {
      const { data } = await supabase.from('test_events').select('id, event_name').order('event_name');
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (f: typeof form & { id?: string }) => {
      const payload = {
        title: f.title.trim(),
        description: f.description?.trim() || null,
        image_url: f.image_url?.trim() || null,
        target_class: f.is_universal || !f.target_class || f.target_class === NONE ? null : f.target_class,
        is_universal: f.is_universal,
        event_id: !f.event_id || f.event_id === NONE ? null : f.event_id,
        is_active: f.is_active,
        priority: f.priority,
      };
      if (f.id) {
        const { error } = await supabase.from('banners').update(payload).eq('id', f.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('banners').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-banners'] });
      qc.invalidateQueries({ queryKey: ['student-banners'] });
      toast({ title: editing ? 'Banner updated' : 'Banner created' });
      resetForm();
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('banners').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-banners'] });
      qc.invalidateQueries({ queryKey: ['student-banners'] });
      toast({ title: 'Banner deleted' });
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from('banners').update({ is_active: active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-banners'] });
      qc.invalidateQueries({ queryKey: ['student-banners'] });
    },
  });

  function resetForm() {
    setForm({ title: '', description: '', image_url: '', target_class: NONE, is_universal: false, event_id: NONE, is_active: true, priority: 0 });
    setEditing(null);
    setDialogOpen(false);
  }

  function openEdit(b: any) {
    setForm({
      title: b.title, description: b.description || '', image_url: b.image_url || '',
      target_class: b.target_class || NONE, is_universal: b.is_universal,
      event_id: b.event_id || NONE, is_active: b.is_active, priority: b.priority,
    });
    setEditing(b);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Banners</h1>
          <p className="text-muted-foreground">Manage dashboard announcement banners</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) resetForm(); setDialogOpen(o); }}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto"><Plus className="w-4 h-4 mr-2" />Create Banner</Button>
          </DialogTrigger>
          <DialogContent
            className="w-[calc(100vw-2rem)] max-w-lg max-h-[90vh] overflow-y-auto"
            onInteractOutside={(e) => e.preventDefault()}
            onPointerDownOutside={(e) => e.preventDefault()}
          >
            <DialogHeader><DialogTitle>{editing ? 'Edit Banner' : 'Create Banner'}</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate({ ...form, id: editing?.id }); }} className="space-y-4">
              <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required /></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>

              <div className="space-y-2">
                <Label>Banner Image</Label>
                <FileUploader
                  bucket="banner-images"
                  accept="image/*"
                  maxSizeMB={5}
                  isImage
                  existingUrl={form.image_url}
                  onUploadComplete={(url) => setForm(p => ({ ...p, image_url: url }))}
                />
              </div>

              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <Switch checked={form.is_universal} onCheckedChange={v => setForm(p => ({ ...p, is_universal: v, target_class: v ? NONE : p.target_class }))} />
                  <Label>All Classes</Label>
                </div>
                {!form.is_universal && (
                  <Select value={form.target_class} onValueChange={v => setForm(p => ({ ...p, target_class: v }))}>
                    <SelectTrigger className="w-32"><SelectValue placeholder="Class" /></SelectTrigger>
                    <SelectContent>{CLASSES.map(c => <SelectItem key={c} value={c}>Class {c}</SelectItem>)}</SelectContent>
                  </Select>
                )}
              </div>

              <div>
                <Label>Link Event (optional)</Label>
                <Select value={form.event_id} onValueChange={v => setForm(p => ({ ...p, event_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="No event" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>None</SelectItem>
                    {events?.map(e => <SelectItem key={e.id} value={e.id}>{e.event_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch checked={form.is_active} onCheckedChange={v => setForm(p => ({ ...p, is_active: v }))} />
                  <Label>Active</Label>
                </div>
                <div className="flex-1">
                  <Label>Priority</Label>
                  <Input type="number" value={form.priority} onChange={e => setForm(p => ({ ...p, priority: parseInt(e.target.value) || 0 }))} />
                </div>
              </div>

              <Button type="submit" className="w-full min-h-[48px]" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : editing ? 'Update Banner' : 'Create Banner'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : !banners?.length ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No banners yet.</CardContent></Card>
      ) : (
        <div className="grid gap-4">
          {banners.map((b: any) => (
            <Card key={b.id}>
              <CardContent className="p-4 flex items-center gap-4">
                {b.image_url ? (
                  <img src={b.image_url} alt="" className="w-20 h-14 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-20 h-14 rounded-lg bg-muted flex items-center justify-center flex-shrink-0"><ImageIcon className="w-6 h-6 text-muted-foreground" /></div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-foreground truncate">{b.title}</h3>
                    <Badge variant={b.is_active ? 'default' : 'secondary'}>{b.is_active ? 'Active' : 'Inactive'}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {b.is_universal ? 'All Classes' : `Class ${b.target_class || '—'}`}
                    {b.test_events?.event_name && ` · ${b.test_events.event_name}`}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Switch checked={b.is_active} onCheckedChange={v => toggleActive.mutate({ id: b.id, active: v })} />
                  <Button size="icon" variant="ghost" onClick={() => openEdit(b)}><Pencil className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { if (confirm('Delete?')) deleteMutation.mutate(b.id); }}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
