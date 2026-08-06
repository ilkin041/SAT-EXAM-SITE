import { Skeleton, SkeletonScreen } from "@/components/ui/skeleton";

/**
 * Test lobby skeleton — back link, title block with the meta row, two section
 * cards, the "Before you begin" panel, and the begin button.
 */
export default function TestStartLoading() {
  return (
    <SkeletonScreen
      label="Loading test details"
      className="container mx-auto max-w-3xl px-4 py-12"
    >
      <Skeleton className="h-5 w-40" />

      {/* Title + meta row. `test.description` is optional and absent on four
          of five seeded tests, so no line is reserved for it. */}
      <div className="mt-4">
        <Skeleton className="h-10 w-80 max-w-full" />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-5 w-20" />
        </div>
      </div>

      {/* Section breakdown */}
      <div className="mt-8 space-y-3">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-card"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div>
                <Skeleton className="h-4 w-36" />
                <Skeleton className="mt-1.5 h-3 w-28" />
              </div>
            </div>
            <div className="text-right">
              <Skeleton className="ml-auto h-4 w-14" />
              <Skeleton className="ml-auto mt-1.5 h-3 w-20" />
            </div>
          </div>
        ))}
      </div>

      {/* Before you begin */}
      <div className="mt-8 rounded-xl border border-border bg-card p-6 shadow-card">
        <Skeleton className="h-5 w-40" />
        <div className="mt-4 space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="mt-0.5 h-4 w-4 shrink-0 rounded" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <Skeleton className="mt-6 h-[54px] w-full rounded-xl" />

      <div className="mt-8">
        <Skeleton className="h-11 w-44 rounded-lg" />
        <Skeleton className="mt-3 h-4 w-full" />
        <Skeleton className="mt-1.5 h-4 w-full" />
        <Skeleton className="mt-1.5 h-4 w-1/2" />
      </div>
    </SkeletonScreen>
  );
}
