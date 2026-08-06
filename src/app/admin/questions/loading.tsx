import { SkeletonScreen, SkeletonTable } from "@/components/ui/skeleton";
import {
  AdminFilterBarSkeleton,
  AdminPageHeaderSkeleton,
} from "../_components/page-skeleton";

/** Question bank skeleton — header with the "New question" action, the
 *  four-control filter form, then the ten-column bank table. */
export default function AdminQuestionsLoading() {
  return (
    <SkeletonScreen label="Loading question bank">
      <AdminPageHeaderSkeleton titleWidth="w-48" withActions />
      <AdminFilterBarSkeleton fields={4} />
      <SkeletonTable
        columns={6}
        rows={10}
        columnWidths={["w-8", "w-56", "w-20", "w-24", "w-20", "w-16"]}
      />
    </SkeletonScreen>
  );
}
