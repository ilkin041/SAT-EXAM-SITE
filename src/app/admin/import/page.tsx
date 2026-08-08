import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { ImportForm } from "./import-form";
import { pageMetadata } from "@/lib/site";

export const metadata: Metadata = pageMetadata({ title: "Import — Admin", path: "/admin/import", noindex: true });

export default function ImportPage() {
  return (
    <>
      <PageHeader
        title="Import"
        description="Bulk-load tests or questions from a JSON file or paste the contents directly."
      />
      <ImportForm />
    </>
  );
}
