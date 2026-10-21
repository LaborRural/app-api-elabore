import { Suspense } from "react";
import AppShell from "@/components/app-shell";
import { getSessionUser } from "@/lib/session";

// Lê o cookie da sessão dentro do Suspense para não bloquear o prerender.
async function ShellWithUser({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  return <AppShell user={user}>{children}</AppShell>;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--canvas)]">{children}</div>}>
      <ShellWithUser>{children}</ShellWithUser>
    </Suspense>
  );
}
