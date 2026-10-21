import { Suspense } from "react";
import AppShell from "@/components/app-shell";
import { getSessionUser } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--canvas)]">{children}</div>}>
      <AppShell user={user}>{children}</AppShell>
    </Suspense>
  );
}
