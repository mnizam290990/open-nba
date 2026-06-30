"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brain, LayoutDashboard, Settings, Users, LogOut } from "lucide-react";
import { clsx } from "clsx";
import { signOut } from "next-auth/react";

interface AppShellProps {
  children: React.ReactNode;
  userRole: "MR" | "RSM" | "ADMIN";
  userName: string;
}

const MR_NAV = [
  { href: "/feed", label: "My Feed", icon: LayoutDashboard },
];

const RSM_NAV = [
  { href: "/feed", label: "My Feed", icon: LayoutDashboard },
  { href: "/rsm", label: "Team Dashboard", icon: Users },
];

const ADMIN_NAV = [
  { href: "/feed", label: "My Feed", icon: LayoutDashboard },
  { href: "/rsm", label: "Team Dashboard", icon: Users },
  { href: "/admin", label: "Admin Console", icon: Settings },
];

export function AppShell({ children, userRole, userName }: AppShellProps) {
  const pathname = usePathname();
  const navItems =
    userRole === "ADMIN" ? ADMIN_NAV : userRole === "RSM" ? RSM_NAV : MR_NAV;

  return (
    <div className="flex h-screen flex-col">
      {/* Top bar (desktop) */}
      <header
        data-testid="app-topbar"
        className="hidden border-b bg-background md:flex"
      >
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4">
          <Link href="/feed" className="flex items-center gap-2.5" aria-label="openNBA home">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
              <Brain className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground">openNBA</span>
          </Link>

          <nav
            data-testid="desktop-nav"
            aria-label="Main navigation"
            className="flex items-center gap-1"
          >
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s/g, "-")}`}
                className={clsx(
                  "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  pathname.startsWith(item.href)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                aria-current={pathname.startsWith(item.href) ? "page" : undefined}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{userName}</span>
            <button
              data-testid="sign-out-btn"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Mobile top bar */}
      <header
        className="flex items-center justify-between border-b bg-background px-4 py-3 md:hidden"
        data-testid="mobile-topbar"
      >
        <Link href="/feed" className="flex items-center gap-2" aria-label="openNBA home">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
            <Brain className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-bold">openNBA</span>
        </Link>
        <span className="text-xs text-muted-foreground">{userRole}</span>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        <div className="mx-auto max-w-7xl px-4 py-4">{children}</div>
      </main>

      {/* Mobile bottom navigation */}
      <nav
        data-testid="mobile-bottom-nav"
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-30 border-t bg-background md:hidden"
      >
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              data-testid={`mobile-nav-${item.label.toLowerCase().replace(/\s/g, "-")}`}
              className={clsx(
                "flex flex-col items-center gap-1 px-4 py-1 text-xs font-medium transition-colors",
                pathname.startsWith(item.href)
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
              aria-current={pathname.startsWith(item.href) ? "page" : undefined}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
          <button
            data-testid="mobile-sign-out-btn"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex flex-col items-center gap-1 px-4 py-1 text-xs font-medium text-muted-foreground"
          >
            <LogOut className="h-5 w-5" />
            Sign out
          </button>
        </div>
      </nav>
    </div>
  );
}
