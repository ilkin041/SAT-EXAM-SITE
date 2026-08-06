import { Skeleton, SkeletonScreen, SkeletonTable } from "@/components/ui/skeleton";
import { AdminPageHeaderSkeleton } from "../_components/page-skeleton";

/** Groups skeleton — header, the inline create-group form, six-column table. */
export default function AdminGroupsLoading() {
  return (
    <SkeletonScreen label="Loading groups">
      <AdminPageHeaderSkeleton titleWidth="w-32" />

      <div className="mb-8 rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <Skeleton className="h-10 min-w-[180px] flex-1 rounded-xl" />
          <Skeleton className="h-10 min-w-[180px] flex-1 rounded-xl" />
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>
      </div>

      <SkeletonTable
        columns={5}
        rows={6}
        columnWidths={["w-40", "w-56", "w-16", "w-28", "w-20"]}
      />
    </SkeletonScreen>
  );
}
