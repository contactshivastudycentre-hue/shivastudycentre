import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
// Select removed: replaced with multi-class chip picker
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
const PRESETS: { label: string; classes: string[] }[] = [
  { label: 'Junior 6-7', classes: ['6', '7'] },
  { label: 'Senior 8-10', classes: ['8', '9', '10'] },
  { label: 'Higher 11-12', classes: ['11', '12'] },
];

type FormState = {
  image_url: string;
  cta_link: string;
  eligible_classes: string[];
  is_universal: boolean;
  is_active: boolean;
  priority: number;
  start_date: Date | null;
  end_date: Date | null;
};

const INITIAL: FormState = {
  image_url: '', cta_link: '', eligible_classes: [], is_universal: true, is_active: true, priority: 0,
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
      const classes = f.is_universal ? [] : f.eligible_classes;
      const payload = {
        title: 'banner',
        image_url: f.image_url.trim(),
        cta_link: f.cta_link?.trim() || null,
        eligible_classes: classes.length ? classes : null,
        // legacy single-class field kept in sync for back-compat
        target_class: classes.length ? classes[0] : null,
        is_universal: f.is_universal,
        is_active: f.is_active,
        priority: f.priority,
        start_date: f.start_date ? f.start_date.toISOString() : null,
        end_date: f.end_date ? f.end_date.toISOString() : null,
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
    const fromArr: string[] = Array.isArray(b.eligible_classes) ? b.eligible_classes.map(String) : [];
    const fallback: string[] = b.target_class ? [String(b.target_class)] : [];
    setForm({
      image_url: b.image_url || '',
      cta_link: b.cta_link || '',
      eligible_classes: fromArr.length ? fromArr : fallback,
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
            className="w-[calc(100vw-1.5rem)] max-w-md rounded-2xl p-0 max-h-[88vh] overflow-y-auto"
            onInteractOutside={(e) => e.preventDefault()}
            onPointerDownOutside={(e) => e.preventDefault()}
          >
            <div className="banner-upload-card rounded-2xl border-0 shadow-none">
              <DialogHeader className="space-y-1 pb-3">
                <DialogTitle className="text-lg">{editing ? 'Edit Banner' : 'Upload Banner'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate({ ...form, id: editing?.id }); }} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm">Banner Image *</Label>
                  <FileUploader
                    bucket="banner-images"
                    accept="image/*"
                    maxSizeMB={5}
                    isImage
                    existingUrl={form.image_url}
                    onUploadComplete={(url) => setForm(p => ({ ...p, image_url: url }))}
                  />
                  <p className="text-xs text-muted-foreground">Recommended size: 1200×600. PNG, JPG, or WEBP.</p>
                </div>

                {form.image_url && (
                  <div className="rounded-xl overflow-hidden border border-border bg-muted">
                    <img src={form.image_url} alt="Preview" className="w-full max-h-[120px] object-cover block" />
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-sm">Click Link</Label>
                  <Input
                    className="h-10 text-sm"
                    value={form.cta_link}
                    onChange={e => setForm(p => ({ ...p, cta_link: e.target.value }))}
                    placeholder="/dashboard/tests"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Start Date</Label>
                    <div className="flex items-center gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button type="button" variant="outline" className={cn('h-10 flex-1 justify-start rounded-[10px] px-3 text-left text-sm font-normal', !form.start_date && 'text-muted-foreground')}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {form.start_date ? format(form.start_date, 'PPP') : 'Anytime'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={form.start_date ?? undefined} onSelect={(d) => setForm(p => ({ ...p, start_date: d ?? null }))} initialFocus className="p-3 pointer-events-auto" />
                        </PopoverContent>
                      </Popover>
                      {form.start_date && (
                        <Button type="button" size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => setForm(p => ({ ...p, start_date: null }))}>
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">End Date</Label>
                    <div className="flex items-center gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button type="button" variant="outline" className={cn('h-10 flex-1 justify-start rounded-[10px] px-3 text-left text-sm font-normal', !form.end_date && 'text-muted-foreground')}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {form.end_date ? format(form.end_date, 'PPP') : 'Forever'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={form.end_date ?? undefined} onSelect={(d) => setForm(p => ({ ...p, end_date: d ?? null }))} initialFocus className="p-3 pointer-events-auto" />
                        </PopoverContent>
                      </Popover>
                      {form.end_date && (
                        <Button type="button" size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => setForm(p => ({ ...p, end_date: null }))}>
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={form.is_universal}
                      onCheckedChange={v => setForm(p => ({ ...p, is_universal: v, eligible_classes: v ? [] : p.eligible_classes }))}
                    />
                    <Label className="text-sm">Show to all classes</Label>
                  </div>

                  {!form.is_universal && (
                    <div className="space-y-2 rounded-[10px] border border-border p-2.5 bg-muted/30">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <Label className="text-xs font-semibold">Target classes</Label>
                        <div className="flex gap-1 flex-wrap">
                          {PRESETS.map((p) => (
                            <Button
                              key={p.label}
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-[11px] rounded-md"
                              onClick={() => setForm((s) => ({ ...s, eligible_classes: p.classes }))}
                            >
                              {p.label}
                            </Button>
                          ))}
                          {form.eligible_classes.length > 0 && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-[11px] text-destructive"
                              onClick={() => setForm((s) => ({ ...s, eligible_classes: [] }))}
                            >
                              Clear
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {CLASSES.map((c) => {
                          const active = form.eligible_classes.includes(c);
                          return (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setForm((s) => ({
                                ...s,
                                eligible_classes: active
                                  ? s.eligible_classes.filter((x) => x !== c)
                                  : [...s.eligible_classes, c].sort((a, b) => Number(a) - Number(b)),
                              }))}
                              className={cn(
                                'h-8 min-w-[44px] px-2 rounded-md text-xs font-medium border transition-colors',
                                active
                                  ? 'bg-primary text-primary-foreground border-primary'
                                  : 'bg-background text-foreground border-border hover:bg-muted',
                              )}
                            >
                              Class {c}
                            </button>
                          );
                        })}
                      </div>
                      {form.eligible_classes.length === 0 && (
                        <p className="text-[11px] text-destructive">Select at least one class.</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-[auto,1fr] items-end gap-3">
                  <div className="flex items-center gap-2 pb-2">
                    <Switch checked={form.is_active} onCheckedChange={v => setForm(p => ({ ...p, is_active: v }))} />
                    <Label className="text-sm">Active</Label>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Priority</Label>
                    <Input className="h-10 text-sm" type="number" value={form.priority} onChange={e => setForm(p => ({ ...p, priority: parseInt(e.target.value) || 0 }))} />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <Button type="submit" className="h-10 px-4 max-w-[180px] rounded-[10px] text-sm font-semibold" disabled={saveMutation.isPending || !form.image_url || (!form.is_universal && form.eligible_classes.length === 0)}>
                    {saveMutation.isPending ? 'Saving...' : editing ? 'Update Banner' : 'Save Banner'}
                  </Button>
                </div>
              </form>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : !banners?.length ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No banners yet. Upload one to get started.</CardContent></Card>
      ) : (
        <div className="grid gap-2.5">
          {banners.map((b: any) => (
            <Card key={b.id}>
              <CardContent className="p-2.5 flex items-center gap-2.5">
                <div className="w-14 h-10 sm:w-16 sm:h-12 rounded-md flex-shrink-0 bg-muted overflow-hidden flex items-center justify-center">
                  {b.image_url ? (
                    <img src={b.image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 flex-wrap">
                    <h3 className="font-semibold text-foreground text-xs sm:text-sm truncate">
                      {b.is_universal
                        ? 'All Classes'
                        : Array.isArray(b.eligible_classes) && b.eligible_classes.length
                        ? `Classes ${[...b.eligible_classes].sort((a: string, z: string) => Number(a) - Number(z)).join(', ')}`
                        : b.target_class
                        ? `Class ${b.target_class}`
                        : '—'}
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
                    <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate mt-0.5">
                      {b.start_date ? format(new Date(b.start_date), 'MMM d') : '—'}
                      {' → '}
                      {b.end_date ? format(new Date(b.end_date), 'MMM d') : 'forever'}
                    </p>
                  )}
                  {b.cta_link && (
                    <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate">→ {b.cta_link}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 px-2.5 rounded-lg text-[11px] font-medium"
                    onClick={() => toggleActive.mutate({ id: b.id, active: !b.is_active })}
                    title={b.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {b.is_active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    <span className="hidden sm:inline">{b.is_active ? 'Hide' : 'Show'}</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 px-2.5 rounded-lg text-[11px] font-medium"
                    onClick={() => openEdit(b)}
                    title="Edit"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Edit</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 px-2.5 rounded-lg text-[11px] font-medium text-destructive"
                    onClick={() => { if (confirm('Delete this banner?')) deleteMutation.mutate(b.id); }}
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Delete</span>
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
