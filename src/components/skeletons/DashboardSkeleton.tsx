import { Skeleton } from '@/components/ui/skeleton';

export function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Welcome Section Skeleton */}
      <div className="rounded-3xl bg-gradient-to-r from-primary/20 to-primary/10 p-8 md:p-10">
        <Skeleton className="h-6 w-32 rounded-full mb-4 bg-white/20" />
        <Skeleton className="h-10 w-64 mb-3 bg-white/20" />
        <Skeleton className="h-6 w-96 max-w-full bg-white/20" />
      </div>

      {/* Stats Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="stat-card">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-9 w-16" />
          </div>
        ))}
      </div>

      {/* Quick Access Skeleton */}
      <div>
        <Skeleton className="h-7 w-32 mb-5" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="dashboard-card">
              <Skeleton className="w-14 h-14 rounded-2xl mb-5" />
              <Skeleton className="h-6 w-20 mb-2" />
              <Skeleton className="h-4 w-full mb-3" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
