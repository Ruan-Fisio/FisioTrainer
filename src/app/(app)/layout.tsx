import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { UserMenu } from "@/components/layout/user-menu";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const user = session?.user;

  return (
    <div className="flex min-h-svh w-full bg-muted/30">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b bg-background/80 px-4 shadow-sm backdrop-blur-md md:px-6">
          <div className="flex items-center gap-2">
            <MobileNav />
          </div>
          <UserMenu
            name={user?.name ?? "Usuário"}
            email={user?.email ?? ""}
          />
        </header>
        <main className="relative flex-1 overflow-y-auto p-4 md:p-6">
          <div
            className="pointer-events-none fixed inset-0 -z-10"
            style={{
              background:
                "radial-gradient(circle at 100% 0%, color-mix(in oklch, var(--primary) 6%, transparent), transparent 45%)",
            }}
          />
          {children}
        </main>
      </div>
    </div>
  );
}
