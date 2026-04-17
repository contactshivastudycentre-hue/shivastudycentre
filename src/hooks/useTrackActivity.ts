import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

type ContentType = 'test' | 'video' | 'note';

interface TrackArgs {
  type: ContentType;
  id: string | undefined | null;
  title?: string | null;
  subtitle?: string | null;
  enabled?: boolean;
}

/**
 * Records that the current student opened a piece of content.
 * Powers the "Resume Learning" card on the dashboard.
 */
export function useTrackActivity({ type, id, title, subtitle, enabled = true }: TrackArgs) {
  useEffect(() => {
    if (!enabled || !id) return;
    // Fire and forget — silent if user is not logged in or RPC fails.
    supabase.rpc('track_activity', {
      p_content_type: type,
      p_content_id: id,
      p_title: title ?? null,
      p_subtitle: subtitle ?? null,
    }).then(({ error }) => {
      if (error) console.debug('[track_activity]', error.message);
    });
  }, [type, id, title, subtitle, enabled]);
}
