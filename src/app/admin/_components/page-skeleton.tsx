import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Stand-in for `PageHeader` — title, description line, and the 12px accent
 * rule, at the same `mb-8` offset. Every admin route opens with one, so the
 * shape lives here instead of being retyped in seven `loading.tsx` files.
 *
 * `titleWidth` should roughly match the real title so the swap is quiet.
 */
export function AdminPageHeaderSkeleton({
  titleWidth = "w-56",
  withActions = false,
}: {
  titleWidth?: string;
  withActions?: boolean;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <Skeleton className={cn("h-9", titleWidth)} />
        <Skeleton className="mt-2 h-4 w-72 max-w-full" />
        <Skeleton className="mt-3 h-1 w-12 rounded-full" />
      </div>
      {withActions && <Skeleton className="h-10 w-36 rounded-lg" />}
    </div>
  );
}

/**
 * The filter/search card that sits above most admin tables: a rounded card
 * with a row of h-10 controls.
 */
export function AdminFilterBarSkeleton({ fields = 3 }: { fields?: number }) {
  return (
    <div className="mb-6 rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-10 min-w-[200px] flex-1 rounded-xl" />
        {Array.from({ length: Math.max(fields - 1, 0) }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-36 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

/** Section heading with the underlined rule the admin lists use. */
export function AdminSectionHeadingSkeleton({
  width = "w-48",
}: {
  width?: string;
}) {
  return (
    <div className="mb-4 flex items-baseline justify-between border-b border-border/40 pb-3">
      <Skeleton className={cn("h-7", width)} />
      <Skeleton className="h-4 w-28" />
    </div>
  );
}
