import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Play, FileText, ClipboardList, ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const TYPE_META = {
  test: { icon: ClipboardList, label: 'Test', color: 'text-violet-600 bg-violet-100', path: (id: string) => `/dashboard/tests/${id}` },
  video: { icon: Play, label: 'Video', color: 'text-rose-600 bg-rose-100', path: (id: string) => `/dashboard/videos/${id}` },
  note: { icon: FileText, label: 'Notes', color: 'text-emerald-600 bg-emerald-100', path: () => `/dashboard/notes` },
} as const;

type ActivityRow = {
  id: string;
  content_type: 'test' | 'video' | 'note';
  content_id: string;
  content_title: string | null;
  content_subtitle: string | null;
  last_opened: string;
};

export function ResumeLearning() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['last-activity', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('last_activity' as any)
        .select('id, content_type, content_id, content_title, content_subtitle, last_opened')
        .eq('user_id', user?.id || '')
        .order('last_opened', { ascending: false })
        .limit(1)
        .maybeSingle();
      return (data as unknown) as ActivityRow | null;
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  if (isLoading) {
    return <Skeleton className="h-[112px] w-full rounded-2xl" />;
  }

  if (!data) return null;

  const meta = TYPE_META[data.content_type];
  const Icon = meta.icon;

  return (
    <Link
      to={meta.path(data.content_id)}
      className="group block rounded-2xl bg-card border border-border p-4 shadow-sm hover:shadow-md hover:border-primary/40 transition-all"
    >
      <div className="flex items-center gap-4">
        <div className={`shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center ${meta.color}`}>
          <Icon className="w-7 h-7" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">
            Continue Learning · {meta.label}
          </p>
          <h3 className="font-display font-bold text-foreground truncate">
            {data.content_title || 'Continue where you left off'}
          </h3>
          {data.content_subtitle && (
            <p className="text-sm text-muted-foreground truncate">{data.content_subtitle}</p>
          )}
        </div>

        <div className="shrink-0 hidden sm:flex items-center gap-1 text-sm font-semibold text-primary">
          Resume <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </div>
        <ArrowRight className="sm:hidden w-5 h-5 text-primary shrink-0" />
      </div>
    </Link>
  );
}
