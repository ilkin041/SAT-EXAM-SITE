import { Skeleton, SkeletonScreen, SkeletonTable } from "@/components/ui/skeleton";
import { AdminPageHeaderSkeleton } from "../../_components/page-skeleton";

/**
 * Item analytics skeleton — three summary tiles, the five-control filter grid,
 * then the wide table. The table keeps the real `min-w-[980px]` so the
 * horizontal scrollbar does not appear and disappear across the swap.
 */
export default function AdminItemAnalyticsLoading() {
  return (
    <SkeletonScreen label="Loading item analytics">
      <AdminPageHeaderSkeleton titleWidth="w-52" withActions />

      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-[124px] rounded-xl" />
        ))}
      </div>

      <div className="my-6 grid gap-3 rounded-2xl border border-border/80 bg-card p-4 shadow-sm md:grid-cols-[1fr_auto_auto_auto_auto]">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-10 rounded-xl md:w-32" />
        ))}
      </div>

      <div className="overflow-x-auto">
        <SkeletonTable
          columns={7}
          rows={10}
          columnWidths={["w-56", "w-20", "w-24", "w-16", "w-16", "w-20", "w-24"]}
          className="min-w-[980px]"
        />
      </div>
    </SkeletonScreen>
  );
}
