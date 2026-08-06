import { SkeletonScreen, SkeletonTable } from "@/components/ui/skeleton";
import { AdminPageHeaderSkeleton } from "../_components/page-skeleton";

/** Tests list skeleton — header with "New test", then the eight-column table.
 *  No filter bar on this route. */
export default function AdminTestsLoading() {
  return (
    <SkeletonScreen label="Loading tests">
      <AdminPageHeaderSkeleton titleWidth="w-28" withActions />
      <SkeletonTable
        columns={7}
        rows={8}
        columnWidths={["w-48", "w-24", "w-20", "w-16", "w-16", "w-28", "w-24"]}
      />
    </SkeletonScreen>
  );
}
