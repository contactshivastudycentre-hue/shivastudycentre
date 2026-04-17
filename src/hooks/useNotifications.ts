import { useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as Notification[];
      const { data } = await supabase
        .from('notifications' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      return ((data as any) || []) as Notification[];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  // Realtime subscription
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const n = payload.new as Notification;
          qc.setQueryData<Notification[]>(['notifications', user.id], (old) => {
            const next = [n, ...(old || [])].slice(0, 20);
            return next;
          });
          toast(n.title, { description: n.body || undefined });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, qc]);

  const unreadCount = (query.data || []).filter((n) => !n.read_at).length;

  const markAsRead = useCallback(
    async (id: string) => {
      if (!user?.id) return;
      await supabase
        .from('notifications' as any)
        .update({ read_at: new Date().toISOString() } as any)
        .eq('id', id);
      qc.setQueryData<Notification[]>(['notifications', user.id], (old) =>
        (old || []).map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
      );
    },
    [user?.id, qc]
  );

  const markAllRead = useCallback(async () => {
    if (!user?.id) return;
    const now = new Date().toISOString();
    await supabase
      .from('notifications' as any)
      .update({ read_at: now } as any)
      .eq('user_id', user.id)
      .is('read_at', null);
    qc.setQueryData<Notification[]>(['notifications', user.id], (old) =>
      (old || []).map((n) => (n.read_at ? n : { ...n, read_at: now }))
    );
  }, [user?.id, qc]);

  return {
    notifications: query.data || [],
    unreadCount,
    isLoading: query.isLoading,
    markAsRead,
    markAllRead,
  };
}
