import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Image as ImageIcon, CalendarIcon, X, Eye, EyeOff } from 'lucide-react';
import { FileUploader } from '@/components/admin/FileUploader';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const CLASSES = ['4', '5', '6', '7', '8', '9', '10', '11', '12'];
const NONE = '__none__';

type FormState = {
  image_url: string;
  cta_link: string;
  target_class: string;
  is_universal: boolean;
  is_active: boolean;
  priority: number;
  start_date: Date | null;
  end_date: Date | null;
};

const INITIAL: FormState = {
  image_url: '', cta_link: '', target_class: NONE, is_universal: true, is_active: true, priority: 0,
  start_date: null, end_date: null,
};

export default function AdminBannersPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<FormState>(INITIAL);

  const { data: banners, isLoading } = useQuery({
    queryKey: ['admin-banners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .order('priority', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (f: FormState & { id?: string }) => {
      if (!f.image_url) throw new Error('Please upload a banner image');
      const payload = {
        title: 'banner',
        image_url: f.image_url.trim(),
        cta_link: f.cta_link?.trim() || null,
        target_class: f.is_universal || !f.target_class || f.target_class === NONE ? null : f.target_class,
        is_universal: f.is_universal,
        is_active: f.is_active,
        priority: f.priority,
        start_date: f.start_date ? f.start_date.toISOString() : null,
        end_date: f.end_date ? f.end_date.toISOString() : null,
        // Clear legacy text fields so nothing is overlaid
        subtitle: null,
        description: null,
        cta_text: null,
        background_color: null,
        template: 'image_only',
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
    setForm(INITIAL);
    setEditing(null);
    setDialogOpen(false);
  }

  function openEdit(b: any) {
    setForm({
      image_url: b.image_url || '',
      cta_link: b.cta_link || '',
      target_class: b.target_class || NONE,
      is_universal: b.is_universal,
      is_active: b.is_active,
      priority: b.priority,
      start_date: b.start_date ? new Date(b.start_date) : null,
      end_date: b.end_date ? new Date(b.end_date) : null,
    });
    setEditing(b);
    setDialogOpen(true);
  }

  return (
    <div className="page-container space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-bold text-foreground">Banners</h1>
          <p className="text-sm text-muted-foreground">Upload banner images shown on student dashboard</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) resetForm(); setDialogOpen(o); }}>
          <DialogTrigger asChild>
            <Button className="h-10 px-4 max-w-[200px] rounded-[10px] text-sm font-semibold self-start sm:self-auto"><Plus className="w-4 h-4 mr-1.5" />Upload Banner</Button>
          </DialogTrigger>
          <DialogContent
            className="w-[calc(100vw-2rem)] max-w-xl max-h-[90vh] overflow-y-auto"
            onInteractOutside={(e) => e.preventDefault()}
            onPointerDownOutside={(e) => e.preventDefault()}
          >
            <DialogHeader><DialogTitle>{editing ? 'Edit Banner' : 'Upload Banner'}</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate({ ...form, id: editing?.id }); }} className="space-y-5">

              <div className="space-y-2">
                <Label>Banner Image *</Label>
                <FileUploader
                  bucket="banner-images"
                  accept="image/*"
                  maxSizeMB={5}
                  isImage
                  existingUrl={form.image_url}
                  onUploadComplete={(url) => setForm(p => ({ ...p, image_url: url }))}
                />
                <p className="text-xs text-muted-foreground">Recommended size: 1200×400 (3:1 ratio). PNG, JPG, or WEBP.</p>
              </div>

              {form.image_url && (
                <div className="rounded-xl overflow-hidden border border-border bg-muted">
                  <img src={form.image_url} alt="Preview" className="w-full max-h-[140px] object-cover block" />
                </div>
              )}

              <div>
                <Label>Click Link (optional)</Label>
                <Input
                  value={form.cta_link}
                  onChange={e => setForm(p => ({ ...p, cta_link: e.target.value }))}
                  placeholder="/dashboard/tests"
                />
                <p className="text-xs text-muted-foreground mt-1">Where students go when they tap the banner.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Start Date (optional)</Label>
                  <div className="flex items-center gap-1">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button type="button" variant="outline" className={cn('flex-1 justify-start text-left font-normal', !form.start_date && 'text-muted-foreground')}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {form.start_date ? format(form.start_date, 'PPP') : 'Anytime'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={form.start_date ?? undefined} onSelect={(d) => setForm(p => ({ ...p, start_date: d ?? null }))} initialFocus className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                    {form.start_date && (
                      <Button type="button" size="icon" variant="ghost" onClick={() => setForm(p => ({ ...p, start_date: null }))}>
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>End Date (optional)</Label>
                  <div className="flex items-center gap-1">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button type="button" variant="outline" className={cn('flex-1 justify-start text-left font-normal', !form.end_date && 'text-muted-foreground')}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {form.end_date ? format(form.end_date, 'PPP') : 'Forever'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={form.end_date ?? undefined} onSelect={(d) => setForm(p => ({ ...p, end_date: d ?? null }))} initialFocus className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                    {form.end_date && (
                      <Button type="button" size="icon" variant="ghost" onClick={() => setForm(p => ({ ...p, end_date: null }))}>
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground -mt-2">Leave empty to show the banner indefinitely.</p>

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

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch checked={form.is_active} onCheckedChange={v => setForm(p => ({ ...p, is_active: v }))} />
                  <Label>Active</Label>
                </div>
                <div className="flex-1">
                  <Label>Priority (higher = first)</Label>
                  <Input type="number" value={form.priority} onChange={e => setForm(p => ({ ...p, priority: parseInt(e.target.value) || 0 }))} />
                </div>
              </div>

              <Button type="submit" className="w-full min-h-[48px]" disabled={saveMutation.isPending || !form.image_url}>
                {saveMutation.isPending ? 'Saving...' : editing ? 'Update Banner' : 'Save Banner'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : !banners?.length ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No banners yet. Upload one to get started.</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {banners.map((b: any) => (
            <Card key={b.id}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="w-16 h-12 sm:w-20 sm:h-14 rounded-md flex-shrink-0 bg-muted overflow-hidden flex items-center justify-center">
                  {b.image_url ? (
                    <img src={b.image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="font-semibold text-foreground text-sm truncate">
                      {b.is_universal ? 'All Classes' : `Class ${b.target_class || '—'}`}
                    </h3>
                    <Badge
                      variant={b.is_active ? 'default' : 'secondary'}
                      className="text-[10px] px-1.5 py-0 h-4"
                    >
                      {b.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                      P{b.priority}
                    </Badge>
                  </div>
                  {(b.start_date || b.end_date) && (
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {b.start_date ? format(new Date(b.start_date), 'MMM d') : '—'}
                      {' → '}
                      {b.end_date ? format(new Date(b.end_date), 'MMM d') : 'forever'}
                    </p>
                  )}
                  {b.cta_link && (
                    <p className="text-[11px] text-muted-foreground truncate">→ {b.cta_link}</p>
                  )}
                </div>
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => toggleActive.mutate({ id: b.id, active: !b.is_active })}
                    title={b.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {b.is_active ? (
                      <Eye className="w-4 h-4 text-primary" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                    )}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => openEdit(b)}
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive"
                    onClick={() => { if (confirm('Delete this banner?')) deleteMutation.mutate(b.id); }}
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
