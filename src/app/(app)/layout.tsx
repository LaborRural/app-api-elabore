import LogoutButton from "./logout-button";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-line bg-surface px-6 py-3">
        <span className="font-semibold text-primary">Elabore</span>
        <LogoutButton />
      </header>
      <main className="mx-auto max-w-6xl p-6">{children}</main>
    </div>
  );
}
