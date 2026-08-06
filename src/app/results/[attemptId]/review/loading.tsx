import { Skeleton, SkeletonScreen } from "@/components/ui/skeleton";

/**
 * Review skeleton. One question is on screen at a time, so this is the single
 * question panel plus the prev/next row and the question-number grid that
 * `review-client.tsx` renders under it.
 */
export default function ReviewLoading() {
  return (
    <SkeletonScreen
      label="Loading answer review"
      className="container mx-auto max-w-6xl px-4 py-8"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-4 w-40" />
      </div>

      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-5 w-32" />
      </div>

      {/* Meta badge row */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Skeleton className="h-5 w-32 rounded-full" />
        <Skeleton className="h-5 w-28 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="ml-auto h-5 w-24 rounded-full" />
      </div>

      {/* Question panel */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-card">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-2/3" />
        <div className="mt-6 space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
        <Skeleton className="mt-6 h-28 w-full rounded-lg" />
      </div>

      <Skeleton className="mx-auto mt-4 h-4 w-48" />

      <div className="mt-6 flex items-center justify-between gap-2">
        <Skeleton className="h-9 w-28 rounded-lg" />
        <Skeleton className="h-4 w-56" />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-1.5">
        {Array.from({ length: 27 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-8 rounded-md" />
        ))}
      </div>
    </SkeletonScreen>
  );
}
