import { SkeletonScreen, SkeletonTable } from "@/components/ui/skeleton";
import {
  AdminFilterBarSkeleton,
  AdminPageHeaderSkeleton,
} from "../_components/page-skeleton";

/** Users list skeleton — header, search form, seven-column table. */
export default function AdminUsersLoading() {
  return (
    <SkeletonScreen label="Loading users">
      <AdminPageHeaderSkeleton titleWidth="w-32" withActions />
      <AdminFilterBarSkeleton fields={2} />
      <SkeletonTable
        columns={6}
        rows={10}
        columnWidths={["w-36", "w-48", "w-20", "w-16", "w-28", "w-20"]}
      />
    </SkeletonScreen>
  );
}
