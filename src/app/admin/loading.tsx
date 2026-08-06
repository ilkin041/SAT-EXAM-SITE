import { SkeletonScreen, SkeletonTable } from "@/components/ui/skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AdminPageHeaderSkeleton,
  AdminSectionHeadingSkeleton,
} from "./_components/page-skeleton";

/**
 * Admin overview skeleton — four stat tiles then the recent-attempts table.
 * Also the fallback for any admin child route that has no `loading.tsx` of
 * its own, which is why the body stays generic below the stat row.
 */
export default function AdminLoading() {
  return (
    <SkeletonScreen label="Loading admin dashboard">
      <AdminPageHeaderSkeleton titleWidth="w-40" />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[124px] rounded-xl" />
        ))}
      </div>

      <section className="mt-10">
        <AdminSectionHeadingSkeleton width="w-44" />
        <SkeletonTable
          columns={4}
          rows={6}
          columnWidths={["w-40", "w-48", "w-24", "w-36"]}
        />
      </section>
    </SkeletonScreen>
  );
}
