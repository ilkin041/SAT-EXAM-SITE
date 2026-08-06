import { Skeleton, SkeletonScreen } from "@/components/ui/skeleton";

/**
 * Score report skeleton. The gauge is the tall element (h-48 w-48 inside a
 * rounded-3xl band); everything below it is the three analysis sections in
 * the same order and with the same `mb-10` / `mb-12` rhythm as `page.tsx`.
 */
export default function ResultsLoading() {
  return (
    <SkeletonScreen
      label="Loading score report"
      className="container mx-auto max-w-4xl px-4 py-10"
    >
      <Skeleton className="mb-6 h-5 w-40" />

      <div className="mb-8 flex flex-col gap-2 border-b border-border/40 pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <Skeleton className="h-9 w-64 max-w-full" />
          <Skeleton className="mt-2.5 h-4 w-44" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-3 w-36" />
        </div>
      </div>

      {/* Score band */}
      <div className="mb-10 flex flex-col items-center rounded-3xl border border-border/50 bg-muted/30 p-8 shadow-sm">
        <Skeleton className="mb-6 h-7 w-48 rounded-full" />
        <Skeleton className="h-48 w-48 rounded-full" />
        <div className="mt-8 grid w-full gap-4 sm:grid-cols-2">
          <Skeleton className="h-[104px] rounded-2xl" />
          <Skeleton className="h-[104px] rounded-2xl" />
        </div>
      </div>

      {/* Performance by domain */}
      <section className="mb-10">
        <div className="mb-4 border-b border-border/40 pb-2">
          <Skeleton className="h-7 w-56" />
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs"
            >
              <Skeleton className="h-5 w-40" />
              <div className="mt-4 space-y-3">
                {[0, 1, 2, 3].map((r) => (
                  <div key={r}>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="mt-1.5 h-2 w-full rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Module breakdown */}
      <section className="mb-10">
        <div className="mb-4 border-b border-border/40 pb-2">
          <Skeleton className="h-7 w-52" />
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      </section>

      {/* Time analysis */}
      <section className="mb-12">
        <div className="mb-4 border-b border-border/40 pb-2">
          <Skeleton className="h-7 w-44" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[116px] rounded-2xl" />
          ))}
        </div>
        <Skeleton className="mt-4 h-20 w-full rounded-xl" />
      </section>

      <div className="mt-8 flex flex-wrap justify-center gap-4 sm:justify-start">
        <Skeleton className="h-10 w-40 rounded-lg" />
        <Skeleton className="h-10 w-36 rounded-lg" />
      </div>
    </SkeletonScreen>
  );
}
