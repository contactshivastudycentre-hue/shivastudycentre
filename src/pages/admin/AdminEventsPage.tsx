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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Trophy, Calendar, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { FileUploader } from '@/components/admin/FileUploader';

const CLASSES = ['4', '5', '6', '7', '8', '9', '10', '11', '12'];
const NONE = '__none__';

function getEventStatus(start: string, end: string) {
  const now = new Date();
  const s = new Date(start);
  const e = new Date(end);
  if (now < s) return 'upcoming';
  if (now >= s && now <= e) return 'active';
  return 'ended';
}

function StatusBadge({ start, end }: { start: string; end: string }) {
  const status = getEventStatus(start, end);
  const map = {
    upcoming: { label: 'Upcoming', className: 'bg-blue-100 text-blue-700' },
    active: { label: 'Active', className: 'bg-green-100 text-green-700' },
    ended: { label: 'Ended', className: 'bg-gray-100 text-gray-600' },
  };
  const s = map[status];
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${s.className}`}>{s.label}</span>;
}

export default function AdminEventsPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [form, setForm] = useState({
    event_name: '', description: '', test_id: NONE, target_class: NONE,
    is_universal: false, start_date: '', end_date: '', banner_image: '',
    first_prize: '', second_prize: '', third_prize: '', extra_reward: '',
    event_type: 'standard' as 'standard' | 'sunday_special',
  });

  const { data: events, isLoading } = useQuery({
    queryKey: ['admin-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('test_events')
        .select('*, event_prizes(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: tests } = useQuery({
    queryKey: ['admin-tests-list'],
    queryFn: async () => {
      const { data } = await supabase.from('tests').select('id, title, class, subject').order('title');
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (f: typeof form & { id?: string }) => {
      // Validate dates
      if (!f.start_date || !f.end_date) {
        throw new Error('Start and end date are required');
      }
      const sd = new Date(f.start_date);
      const ed = new Date(f.end_date);
      if (isNaN(sd.getTime()) || isNaN(ed.getTime())) {
        throw new Error('Invalid date format');
      }
      if (ed.getTime() <= sd.getTime()) {
        throw new Error('End date must be after start date (give the test a real time window).');
      }
      // Sunday Special: require at least 5 minutes window so students can join
      if (f.event_type === 'sunday_special' && ed.getTime() - sd.getTime() < 5 * 60_000) {
        throw new Error('Sunday Special must run for at least 5 minutes.');
      }
      const eventData = {
        event_name: f.event_name.trim(),
        description: f.description?.trim() || null,
        test_id: !f.test_id || f.test_id === NONE ? null : f.test_id,
        target_class: f.is_universal || !f.target_class || f.target_class === NONE ? null : f.target_class,
        is_universal: f.is_universal, start_date: f.start_date, end_date: f.end_date,
        banner_image: f.banner_image?.trim() || null, status: 'active',
        event_type: f.event_type,
      } as any;
      let eventId = f.id;
      if (eventId) {
        const { error } = await supabase.from('test_events').update(eventData).eq('id', eventId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('test_events').insert(eventData).select().single();
        if (error) throw error;
        eventId = data.id;
      }
      // Upsert prizes
      const prizeData = {
        event_id: eventId!, first_prize: f.first_prize || null,
        second_prize: f.second_prize || null, third_prize: f.third_prize || null,
        extra_reward: f.extra_reward || null,
      };
      const { error: pe } = await supabase.from('event_prizes').upsert(prizeData, { onConflict: 'event_id' });
      if (pe) throw pe;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-events'] });
      toast({ title: editingEvent ? 'Event updated' : 'Event created' });
      resetForm();
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('test_events').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-events'] });
      toast({ title: 'Event deleted' });
    },
  });

  const togglePublish = useMutation({
    mutationFn: async ({ id, publish }: { id: string; publish: boolean }) => {
      const { error } = await supabase
        .from('test_events')
        .update({ results_approved: publish })
        .eq('id', id);
      if (error) throw error;
      return publish;
    },
    onSuccess: (publish) => {
      qc.invalidateQueries({ queryKey: ['admin-events'] });
      toast({
        title: publish ? 'Results published!' : 'Results unpublished',
        description: publish
          ? 'Leaderboard is now visible to students.'
          : 'Leaderboard is hidden from students. You can publish again anytime.',
      });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  function resetForm() {
    setForm({ event_name: '', description: '', test_id: NONE, target_class: NONE, is_universal: false, start_date: '', end_date: '', banner_image: '', first_prize: '', second_prize: '', third_prize: '', extra_reward: '', event_type: 'standard' });
    setEditingEvent(null);
    setDialogOpen(false);
  }

  function openEdit(ev: any) {
    const prize = ev.event_prizes?.[0] || {};
    setForm({
      event_name: ev.event_name, description: ev.description || '',
      test_id: ev.test_id || NONE, target_class: ev.target_class || NONE,
      is_universal: ev.is_universal, start_date: ev.start_date?.slice(0, 16) || '',
      end_date: ev.end_date?.slice(0, 16) || '', banner_image: ev.banner_image || '',
      first_prize: prize.first_prize || '', second_prize: prize.second_prize || '',
      third_prize: prize.third_prize || '', extra_reward: prize.extra_reward || '',
      event_type: ev.event_type || 'standard',
    });
    setEditingEvent(ev);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Test Events</h1>
          <p className="text-muted-foreground">Manage special test events, prizes, and results</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) resetForm(); setDialogOpen(o); }}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Create Event</Button>
          </DialogTrigger>
          <DialogContent
            className="w-[calc(100vw-2rem)] max-w-lg max-h-[90vh] overflow-y-auto"
            onInteractOutside={(e) => e.preventDefault()}
            onPointerDownOutside={(e) => e.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle>{editingEvent ? 'Edit Event' : 'Create Event'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate({ ...form, id: editingEvent?.id }); }} className="space-y-4">
              <div>
                <Label>Event Name *</Label>
                <Input value={form.event_name} onChange={e => setForm(p => ({ ...p, event_name: e.target.value }))} required />
              </div>
              <div>
                <Label>Event Type *</Label>
                <Select value={form.event_type} onValueChange={(v: 'standard' | 'sunday_special') => setForm(p => ({ ...p, event_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">📝 Standard Event</SelectItem>
                    <SelectItem value="sunday_special">🏆 Sunday Special Test</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
              </div>
              <div>
                <Label>Link Test</Label>
                <Select value={form.test_id} onValueChange={v => setForm(p => ({ ...p, test_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select test" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>None (no test linked)</SelectItem>
                    {tests?.map(t => <SelectItem key={t.id} value={t.id}>{t.title} ({t.class} - {t.subject})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <Switch checked={form.is_universal} onCheckedChange={v => setForm(p => ({ ...p, is_universal: v, target_class: v ? NONE : p.target_class }))} />
                  <Label>All Classes</Label>
                </div>
                {!form.is_universal && (
                  <Select value={form.target_class} onValueChange={v => setForm(p => ({ ...p, target_class: v }))}>
                    <SelectTrigger className="w-32"><SelectValue placeholder="Class" /></SelectTrigger>
                    <SelectContent>
                      {CLASSES.map(c => <SelectItem key={c} value={c}>Class {c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Start Date *</Label>
                  <Input type="datetime-local" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} required />
                </div>
                <div>
                  <Label>End Date *</Label>
                  <Input type="datetime-local" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Banner Image</Label>
                <FileUploader
                  bucket="banner-images"
                  accept="image/*"
                  maxSizeMB={5}
                  isImage
                  existingUrl={form.banner_image}
                  onUploadComplete={(url) => setForm(p => ({ ...p, banner_image: url }))}
                />
              </div>
              <div className="border-t pt-4">
                <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2"><Trophy className="w-4 h-4" />Prize Pool</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>1st Prize</Label><Input value={form.first_prize} onChange={e => setForm(p => ({ ...p, first_prize: e.target.value }))} placeholder="₹100" /></div>
                  <div><Label>2nd Prize</Label><Input value={form.second_prize} onChange={e => setForm(p => ({ ...p, second_prize: e.target.value }))} placeholder="Free Notes" /></div>
                  <div><Label>3rd Prize</Label><Input value={form.third_prize} onChange={e => setForm(p => ({ ...p, third_prize: e.target.value }))} placeholder="Certificate" /></div>
                  <div><Label>Extra Reward</Label><Input value={form.extra_reward} onChange={e => setForm(p => ({ ...p, extra_reward: e.target.value }))} /></div>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : editingEvent ? 'Update Event' : 'Create Event'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading events...</p>
      ) : !events?.length ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No events yet. Create your first event!</CardContent></Card>
      ) : (
        <div className="grid gap-4">
          {events.map((ev: any) => {
            const prize = ev.event_prizes?.[0];
            return (
              <motion.div key={ev.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card>
                  <CardContent className="p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {ev.event_type === 'sunday_special' && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-sm">🏆 Sunday Special</span>
                          )}
                          <h3 className="font-display font-bold text-foreground truncate">{ev.event_name}</h3>
                          <StatusBadge start={ev.start_date} end={ev.end_date} />
                          {ev.results_approved && <Badge variant="secondary" className="bg-green-100 text-green-700">Results Published</Badge>}
                        </div>
                        {ev.description && <p className="text-sm text-muted-foreground mb-2">{ev.description}</p>}
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(ev.start_date).toLocaleDateString()} - {new Date(ev.end_date).toLocaleDateString()}</span>
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{ev.is_universal ? 'All Classes' : `Class ${ev.target_class}`}</span>
                          {prize?.first_prize && <span className="flex items-center gap-1"><Trophy className="w-3 h-3" />🥇 {prize.first_prize}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                        {getEventStatus(ev.start_date, ev.end_date) === 'ended' && (
                          ev.results_approved ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-amber-600 border-amber-300 hover:bg-amber-50"
                              onClick={() => {
                                if (confirm('Unpublish results? Students will no longer see the leaderboard until you publish again.')) {
                                  togglePublish.mutate({ id: ev.id, publish: false });
                                }
                              }}
                              disabled={togglePublish.isPending}
                            >
                              Unpublish
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 border-green-300 hover:bg-green-50"
                              onClick={() => togglePublish.mutate({ id: ev.id, publish: true })}
                              disabled={togglePublish.isPending}
                            >
                              {ev.results_approved === false ? 'Publish Results' : 'Publish Results'}
                            </Button>
                          )
                        )}
                        <Button size="icon" variant="ghost" onClick={() => openEdit(ev)}><Pencil className="w-4 h-4" /></Button>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { if (confirm('Delete this event?')) deleteMutation.mutate(ev.id); }}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
