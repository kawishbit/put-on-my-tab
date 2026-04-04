"use client";

import {
  BookUser,
  CirclePlus,
  House,
  List,
  Settings,
  Tags,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";

import { LogoutButton } from "@/components/auth/LogoutButton";
import { Button } from "@/components/ui/button";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  requireAuth?: boolean;
  allowedPolicies?: Array<"user" | "mod" | "admin">;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: House, requireAuth: true },
  {
    href: "/transactions/create",
    label: "Add Trx",
    icon: CirclePlus,
    requireAuth: true,
    allowedPolicies: ["mod", "admin"],
  },
  {
    href: "/my-transactions",
    label: "My Trx",
    icon: BookUser,
    requireAuth: true,
  },
  {
    href: "/transactions",
    label: "All Trx",
    icon: List,
    requireAuth: true,
    allowedPolicies: ["admin"],
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
    requireAuth: true,
    allowedPolicies: ["admin"],
  },
  {
    href: "/settings/admin/users",
    label: "Users",
    icon: Users,
    requireAuth: true,
    allowedPolicies: ["admin"],
  },
  {
    href: "/settings/admin/categories",
    label: "Trx Categories",
    icon: Tags,
    requireAuth: true,
    allowedPolicies: ["admin"],
  },
];

function isPathActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function getActiveHref(pathname: string, items: NavItem[]): string | null {
  const matches = items.filter((item) => isPathActive(pathname, item.href));

  if (matches.length === 0) {
    return null;
  }

  return matches.sort((left, right) => right.href.length - left.href.length)[0]
    ?.href;
}

export function AppShell({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const policy = session?.user?.policy;

  const isAuthPage = pathname.startsWith("/login");
  const isPublicHome = pathname === "/";

  const navItems = useMemo(() => {
    return NAV_ITEMS.filter((item) => {
      if (!item.requireAuth) {
        return true;
      }

      if (!session?.user?.id) {
        return false;
      }

      if (!item.allowedPolicies || !policy) {
        return true;
      }

      return item.allowedPolicies.includes(policy);
    });
  }, [policy, session?.user?.id]);

  const activeHref = useMemo(
    () => getActiveHref(pathname, navItems),
    [navItems, pathname],
  );

  useEffect(() => {
    setIsMobileMenuOpen((previous) => {
      if (!previous) {
        return previous;
      }

      return pathname.length >= 0 ? false : previous;
    });
  }, [pathname]);

  useEffect(() => {
    let lastY = window.scrollY;

    function onScroll(): void {
      const currentY = window.scrollY;

      if (currentY < 24) {
        setIsHeaderVisible(true);
      } else if (currentY > lastY) {
        setIsHeaderVisible(false);
      } else {
        setIsHeaderVisible(true);
      }

      lastY = currentY;
    }

    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  if (isAuthPage || isPublicHome) {
    return (
      <div className="relative flex min-h-screen items-center justify-center px-4 py-10">
        {children}
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <header
        className={`app-header ${
          isHeaderVisible ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between px-4 py-3 md:px-6">
          <div className="flex items-center gap-3 lg:flex-1">
            <Link
              href={session?.user?.id ? "/dashboard" : "/"}
              className="group inline-flex items-center gap-3"
              aria-label="Home"
              title="Home"
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-slate-600 to-slate-900 text-sm font-bold text-white shadow-lg shadow-slate-500/30 dark:from-slate-500 dark:to-slate-700 dark:shadow-slate-900/50">
                PT
              </span>
            </Link>

            <div className="hidden items-center gap-2 md:flex">
              {navItems.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-label={item.label}
                    title={item.label}
                    className={`app-top-nav-link ${
                      item.href === activeHref ? "app-top-nav-link-active" : ""
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden xl:inline">{item.label}</span>
                    <span className="xl:hidden sr-only">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-3 text-right">
            <Button
              onClick={() => setIsMobileMenuOpen((previous) => !previous)}
              variant="secondary"
              size="icon"
              className="h-9 w-9 rounded-lg md:hidden"
              aria-label="Toggle menu"
            >
              <span className="text-lg leading-none">≡</span>
            </Button>
            {status === "loading" ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Checking session...
              </p>
            ) : session?.user?.email ? (
              <>
                <div className="hidden md:block">
                  <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                    {session.user.email}
                  </p>
                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {session.user.policy}
                  </p>
                </div>
                <div className="hidden md:block">
                  <LogoutButton />
                </div>
              </>
            ) : (
              <Link
                href="/login"
                className="hidden app-top-nav-link md:inline-flex"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      {isMobileMenuOpen ? (
        <div
          className="fixed inset-0 z-50 md:hidden"
          role="dialog"
          aria-modal="true"
        >
          <Button
            className="absolute inset-0 bg-slate-900/40"
            aria-label="Close menu"
            onClick={() => setIsMobileMenuOpen(false)}
            variant="ghost"
          />
          <div className="absolute right-0 top-0 h-full w-72 border-l border-slate-200 bg-white p-4 shadow-2xl dark:border-white/10 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Menu
              </p>
              <Button
                className="h-8 w-8 rounded-lg"
                aria-label="Close menu"
                onClick={() => setIsMobileMenuOpen(false)}
                variant="secondary"
                size="icon"
              >
                ×
              </Button>
            </div>

            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`app-side-nav-link ${
                      item.href === activeHref ? "app-side-nav-link-active" : ""
                    }`}
                    aria-label={item.label}
                    title={item.label}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="mt-6 border-t border-slate-200 pt-4 dark:border-white/10">
              {session?.user?.email ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {session.user.email}
                    </p>
                    <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {session.user.policy}
                    </p>
                  </div>
                  <LogoutButton />
                </div>
              ) : (
                <Link
                  href="/login"
                  className="app-button-primary block w-full text-center"
                >
                  Sign in
                </Link>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <div className="mx-auto w-full max-w-[1400px] px-4 pb-8 pt-24 md:px-6">
        <main className="min-w-0 flex-1">
          <div className="space-y-6">{children}</div>
          <footer className="mt-10 rounded-2xl border border-white/60 bg-white/75 px-4 py-4 text-sm text-slate-600 shadow-lg shadow-slate-200/40 backdrop-blur dark:border-white/8 dark:bg-slate-800/40 dark:text-slate-400 dark:shadow-none">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <p>Put On My Tab</p>
              <p>Shared expense tracking for households and small groups.</p>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
