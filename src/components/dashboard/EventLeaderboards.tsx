import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Trophy, ChevronRight } from 'lucide-react';

type EventRow = {
  id: string;
  event_name: string;
  end_date: string;
  results_approved: boolean;
};

export function EventLeaderboards() {
  const { profile } = useAuth();

  const { data: events } = useQuery({
    queryKey: ['student-event-leaderboards', profile?.class],
    queryFn: async () => {
      const { data } = await supabase
        .from('test_events')
        .select('id, event_name, end_date, results_approved')
        .eq('results_approved', true)
        .order('end_date', { ascending: false })
        .limit(5);
      return (data || []) as EventRow[];
    },
    enabled: !!profile,
    staleTime: 60_000,
  });

  if (!events?.length) return null;

  return (
    <div>
      <h2 className="text-base font-display font-bold text-foreground mb-3 px-1 flex items-center gap-2">
        <Trophy className="w-4 h-4 text-primary" />
        Event Leaderboards
      </h2>
      <div className="space-y-2">
        {events.map((e) => (
          <Link
            key={e.id}
            to={`/dashboard/leaderboard/${e.id}`}
            className="flex items-center gap-3 bg-card rounded-2xl border border-border p-4 shadow-sm hover:shadow-md hover:border-primary/40 transition-all active:scale-[0.98]"
          >
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-yellow-300 to-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Trophy className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display font-bold text-foreground truncate">{e.event_name}</p>
              <p className="text-xs text-muted-foreground">Results published — view rankings</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
}
