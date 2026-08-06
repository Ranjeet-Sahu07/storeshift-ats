import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/progress';

/** Consistent "content is loading" placeholder for admin/intern pages. */
export function PageSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}
