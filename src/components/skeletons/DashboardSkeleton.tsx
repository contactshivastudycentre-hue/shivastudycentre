import { Skeleton } from '@/components/ui/skeleton';

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 max-w-3xl mx-auto animate-pulse">
      {/* Banner */}
      <Skeleton className="w-full rounded-2xl" style={{ aspectRatio: '3 / 1' }} />

      {/* Resume card */}
      <Skeleton className="h-[112px] w-full rounded-2xl" />

      {/* Stats grid 2x2 */}
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-[100px] rounded-2xl" />
        ))}
      </div>

      {/* Quick access */}
      <div>
        <Skeleton className="h-5 w-28 mb-3" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[112px] rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
