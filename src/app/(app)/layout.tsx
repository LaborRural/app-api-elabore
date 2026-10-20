import { Suspense } from "react";
import AppShell from "@/components/app-shell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--canvas)]">{children}</div>}>
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}
