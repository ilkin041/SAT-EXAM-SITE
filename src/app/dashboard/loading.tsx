import { Skeleton, SkeletonScreen, SkeletonTable } from "@/components/ui/skeleton";

/**
 * Dashboard skeleton. Mirrors the real page's box model: nav bar, hero band
 * with the three stat tiles, trend card, two-up test grid, history table.
 * Section spacing (`mb-10`, `mb-14`, `border-b pb-3`) is copied verbatim from
 * `page.tsx` so the swap to real content does not move anything.
 */
export default function DashboardLoading() {
  return (
    <SkeletonScreen label="Loading dashboard">
      {/* StudentNav placeholder — same sticky h-14 bar */}
      <div className="sticky top-0 z-40 border-b border-border/50 glass shadow-sm">
        <div className="container mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-4 w-28" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="h-9 w-32 rounded-lg" />
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-6xl px-4 py-10">
        {/* Hero band */}
        <div className="mb-10 rounded-3xl border border-border/50 bg-muted/30 p-6 shadow-sm md:p-8">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div className="max-w-xl flex-1">
              <Skeleton className="mb-3 h-6 w-40 rounded-full" />
              <Skeleton className="h-9 w-72 max-w-full md:h-10" />
              <Skeleton className="mt-3.5 h-4 w-full" />
              <Skeleton className="mt-2 h-4 w-3/4" />
            </div>

            <div className="grid min-w-[280px] grid-cols-3 gap-3 md:min-w-[360px]">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-border/40 bg-card/60 p-4 text-center shadow-xs"
                >
                  <Skeleton className="mx-auto h-8 w-12 md:h-9" />
                  <Skeleton className="mx-auto mt-1 h-3 w-16" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Progress over time */}
        <section className="mb-14">
          <div className="mb-4 border-b border-border/40 pb-3">
            <Skeleton className="h-7 w-48" />
          </div>
          <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <Skeleton className="h-5 w-44" />
                <Skeleton className="mt-1.5 h-3 w-56" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <Skeleton className="h-52 w-full rounded-xl" />
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-[54px] rounded-lg" />
              ))}
            </div>
          </div>
        </section>

        {/* Available tests */}
        <section className="mb-14">
          <div className="mb-6 flex items-baseline justify-between border-b border-border/40 pb-3">
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-6 pl-8 shadow-card"
              >
                <div className="absolute inset-y-0 left-0 w-1.5 bg-muted" />
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="mt-3 h-4 w-full" />
                <Skeleton className="mt-2 h-4 w-4/5" />
                <div className="mt-4 flex items-center gap-4">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-28" />
                </div>
                <Skeleton className="mt-9 h-10 w-full rounded-lg" />
              </div>
            ))}
          </div>
        </section>

        {/* Practice history */}
        <section className="mb-6">
          <div className="mb-6 flex items-baseline justify-between border-b border-border/40 pb-3">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
          <SkeletonTable
            columns={5}
            rows={5}
            columnWidths={["w-48", "w-24", "w-14", "w-28", "w-24"]}
          />
        </section>
      </div>
    </SkeletonScreen>
  );
}
