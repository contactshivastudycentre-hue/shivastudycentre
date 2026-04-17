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
import { Plus, Pencil, Trash2, Image as ImageIcon, Trophy, Award, Sparkles, BookOpen, FileText, ArrowRight } from 'lucide-react';
import { FileUploader } from '@/components/admin/FileUploader';

const CLASSES = ['4', '5', '6', '7', '8', '9', '10', '11', '12'];
const NONE = '__none__';

const TEMPLATES = [
  { id: 'test_announcement', label: 'Test Announcement', icon: Trophy, bg: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)', accent: '#FBBF24' },
  { id: 'result_announcement', label: 'Result Announcement', icon: Award, bg: 'linear-gradient(135deg, #059669 0%, #10B981 100%)', accent: '#FEF3C7' },
  { id: 'topper_banner', label: 'Topper Highlight', icon: Sparkles, bg: 'linear-gradient(135deg, #D97706 0%, #F59E0B 100%)', accent: '#FFFFFF' },
  { id: 'notes_update', label: 'Notes Update', icon: BookOpen, bg: 'linear-gradient(135deg, #0EA5E9 0%, #06B6D4 100%)', accent: '#E0F2FE' },
  { id: 'scholarship_banner', label: 'Scholarship', icon: FileText, bg: 'linear-gradient(135deg, #DB2777 0%, #E11D48 100%)', accent: '#FECACA' },
];

type FormState = {
  title: string;
  subtitle: string;
  description: string;
  cta_text: string;
  cta_link: string;
  image_url: string;
  template: string;
  background_color: string;
  target_class: string;
  is_universal: boolean;
  event_id: string;
  is_active: boolean;
  priority: number;
};

const INITIAL: FormState = {
  title: '', subtitle: '', description: '', cta_text: '', cta_link: '',
  image_url: '', template: 'test_announcement', background_color: '',
  target_class: NONE, is_universal: false, event_id: NONE, is_active: true, priority: 0,
};

export default function AdminBannersPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<FormState>(INITIAL);

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
    mutationFn: async (f: FormState & { id?: string }) => {
      const payload = {
        title: f.title.trim(),
        subtitle: f.subtitle?.trim() || null,
        description: f.description?.trim() || null,
        cta_text: f.cta_text?.trim() || null,
        cta_link: f.cta_link?.trim() || null,
        image_url: f.image_url?.trim() || null,
        template: f.template || 'test_announcement',
        background_color: f.background_color?.trim() || null,
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
    setForm(INITIAL);
    setEditing(null);
    setDialogOpen(false);
  }

  function openEdit(b: any) {
    setForm({
      title: b.title,
      subtitle: b.subtitle || '',
      description: b.description || '',
      cta_text: b.cta_text || '',
      cta_link: b.cta_link || '',
      image_url: b.image_url || '',
      template: b.template || 'test_announcement',
      background_color: b.background_color || '',
      target_class: b.target_class || NONE,
      is_universal: b.is_universal,
      event_id: b.event_id || NONE,
      is_active: b.is_active,
      priority: b.priority,
    });
    setEditing(b);
    setDialogOpen(true);
  }

  const activeTemplate = TEMPLATES.find(t => t.id === form.template) || TEMPLATES[0];
  const PreviewIcon = activeTemplate.icon;
  const previewBg = form.background_color || activeTemplate.bg;

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
            className="w-[calc(100vw-2rem)] max-w-2xl max-h-[90vh] overflow-y-auto"
            onInteractOutside={(e) => e.preventDefault()}
            onPointerDownOutside={(e) => e.preventDefault()}
          >
            <DialogHeader><DialogTitle>{editing ? 'Edit Banner' : 'Create Banner'}</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate({ ...form, id: editing?.id }); }} className="space-y-5">

              {/* Live preview */}
              <div className="rounded-xl overflow-hidden border border-border">
                <div
                  className="relative w-full h-[180px]"
                  style={{ background: previewBg }}
                >
                  <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
                  {form.image_url && (
                    <div className="absolute right-0 top-0 bottom-0 w-1/2 hidden sm:block">
                      <img src={form.image_url} alt="" className="w-full h-full object-cover" style={{ maskImage: 'linear-gradient(to left, black 40%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to left, black 40%, transparent 100%)' }} />
                    </div>
                  )}
                  <div className="relative z-10 h-full flex flex-col justify-center px-5 max-w-[60%]">
                    <div className="inline-flex items-center gap-1.5 self-start bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 mb-2">
                      <PreviewIcon className="w-3.5 h-3.5" style={{ color: activeTemplate.accent }} />
                      <span className="text-[11px] font-semibold text-white uppercase tracking-wider">{activeTemplate.label}</span>
                    </div>
                    <h2 className="text-white font-bold text-xl leading-tight mb-1 line-clamp-2">{form.title || 'Banner Title'}</h2>
                    {(form.subtitle || form.description) && (
                      <p className="text-white/85 text-sm font-medium mb-3 line-clamp-2">{form.subtitle || form.description}</p>
                    )}
                    {form.cta_text && (
                      <span className="self-start inline-flex items-center bg-white text-slate-900 font-bold rounded-full px-4 h-9 text-sm">
                        {form.cta_text} <ArrowRight className="w-4 h-4 ml-1" />
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Template */}
              <div>
                <Label>Template *</Label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-2">
                  {TEMPLATES.map(t => {
                    const Icon = t.icon;
                    const selected = form.template === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setForm(p => ({ ...p, template: t.id }))}
                        className={`relative h-16 rounded-lg overflow-hidden border-2 transition-all ${selected ? 'border-primary scale-95' : 'border-transparent'}`}
                        style={{ background: t.bg }}
                      >
                        <Icon className="absolute top-2 left-2 w-3.5 h-3.5 text-white" />
                        <span className="absolute bottom-1 left-2 right-2 text-[10px] font-semibold text-white text-left leading-tight">{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required maxLength={60} placeholder="Sunday Mega Test" /></div>
                <div><Label>Subtitle</Label><Input value={form.subtitle} onChange={e => setForm(p => ({ ...p, subtitle: e.target.value }))} maxLength={80} placeholder="Class 10 | Prize ₹100" /></div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div><Label>CTA Text</Label><Input value={form.cta_text} onChange={e => setForm(p => ({ ...p, cta_text: e.target.value }))} placeholder="Attempt Now" maxLength={20} /></div>
                <div><Label>CTA Link</Label><Input value={form.cta_link} onChange={e => setForm(p => ({ ...p, cta_link: e.target.value }))} placeholder="/dashboard/tests" /></div>
              </div>

              <div>
                <Label>Description (fallback if no subtitle)</Label>
                <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} />
              </div>

              <div className="space-y-2">
                <Label>Banner Image (optional, shown on right)</Label>
                <FileUploader
                  bucket="banner-images"
                  accept="image/*"
                  maxSizeMB={5}
                  isImage
                  existingUrl={form.image_url}
                  onUploadComplete={(url) => setForm(p => ({ ...p, image_url: url }))}
                />
                <p className="text-xs text-muted-foreground">Recommended: 800×400 WEBP/PNG. Auto-faded into the design.</p>
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
                <p className="text-xs text-muted-foreground mt-1">Auto-shows Attempt Now / Result Soon based on event status.</p>
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
          {banners.map((b: any) => {
            const tpl = TEMPLATES.find(t => t.id === b.template) || TEMPLATES[0];
            return (
              <Card key={b.id}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-20 h-14 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ background: b.background_color || tpl.bg }}>
                    {b.image_url ? <img src={b.image_url} alt="" className="w-full h-full object-cover rounded-lg" /> : <ImageIcon className="w-6 h-6 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-foreground truncate">{b.title}</h3>
                      <Badge variant={b.is_active ? 'default' : 'secondary'}>{b.is_active ? 'Active' : 'Inactive'}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {tpl.label} · {b.is_universal ? 'All Classes' : `Class ${b.target_class || '—'}`}
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
            );
          })}
        </div>
      )}
    </div>
  );
}
