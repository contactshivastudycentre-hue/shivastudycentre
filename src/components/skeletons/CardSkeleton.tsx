import { Skeleton } from '@/components/ui/skeleton';

interface CardSkeletonProps {
  variant?: 'note' | 'video' | 'test';
}

export function CardSkeleton({ variant = 'note' }: CardSkeletonProps) {
  if (variant === 'video') {
    return (
      <div className="dashboard-card">
        <Skeleton className="aspect-video rounded-xl mb-4" />
        <div className="flex items-center gap-2 mb-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
        <Skeleton className="h-5 w-3/4" />
      </div>
    );
  }

  if (variant === 'test') {
    return (
      <div className="dashboard-card">
        <div className="flex items-start gap-4">
          <Skeleton className="w-12 h-12 rounded-xl flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <Skeleton className="h-9 flex-1 rounded-lg" />
        </div>
      </div>
    );
  }

  // Default note skeleton
  return (
    <div className="dashboard-card">
      <div className="flex items-start gap-4">
        <Skeleton className="w-12 h-12 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/4" />
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-9 flex-1 rounded-lg" />
        <Skeleton className="h-9 flex-1 rounded-lg" />
      </div>
    </div>
  );
}

export function CardSkeletonGrid({ count = 4, variant = 'note' }: { count?: number; variant?: 'note' | 'video' | 'test' }) {
  return (
    <div className={`grid gap-4 ${variant === 'video' ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2'}`}>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} variant={variant} />
      ))}
    </div>
  );
}
