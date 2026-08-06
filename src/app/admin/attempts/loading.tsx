import { SkeletonScreen, SkeletonTable } from "@/components/ui/skeleton";
import {
  AdminFilterBarSkeleton,
  AdminPageHeaderSkeleton,
} from "../_components/page-skeleton";

/** Attempts list skeleton — header, filter form, eight-column table. */
export default function AdminAttemptsLoading() {
  return (
    <SkeletonScreen label="Loading attempts">
      <AdminPageHeaderSkeleton titleWidth="w-36" withActions />
      <AdminFilterBarSkeleton fields={4} />
      <SkeletonTable
        columns={7}
        rows={10}
        columnWidths={["w-36", "w-40", "w-24", "w-16", "w-16", "w-32", "w-20"]}
      />
    </SkeletonScreen>
  );
}
