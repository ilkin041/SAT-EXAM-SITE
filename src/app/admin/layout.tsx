import { requireAdmin } from "@/lib/auth-helpers";
import { AdminNav } from "@/components/admin-nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();

  return (
    <div className="min-h-screen bg-background">
      <AdminNav email={user.email ?? "admin"} />
      <div className="container mx-auto max-w-6xl px-4 py-8">{children}</div>
    </div>
  );
}
