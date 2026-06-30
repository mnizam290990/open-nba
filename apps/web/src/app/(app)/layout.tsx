import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import { AppLayoutClient } from "@/components/layout/AppLayoutClient";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const userRole = (session.user as { role: "MR" | "RSM" | "ADMIN" }).role;
  const userName = session.user.name ?? session.user.email ?? "User";

  return (
    <AppLayoutClient>
      <AppShell userRole={userRole} userName={userName}>
        {children}
      </AppShell>
    </AppLayoutClient>
  );
}
