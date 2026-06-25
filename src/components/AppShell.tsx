"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
};

function DashboardIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  );
}

function CodeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="m16 18 6-6-6-6" />
      <path d="m8 6-6 6 6 6" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M3 3v18h18" />
      <path d="m19 9-5 5-4-4-3 3" />
    </svg>
  );
}

const NAV: NavItem[] = [
  { href: "/", label: "Dashboard", icon: <DashboardIcon /> },
  { href: "/#actions", label: "Recovery Actions", icon: <ChartIcon /> },
  { href: "/docs", label: "API Reference", icon: <CodeIcon /> },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const isDocs = pathname.startsWith("/docs");

  const title = isDocs ? "API Reference" : "Dashboard";

  const isActive = (href: string) => {
    if (href.startsWith("/#")) return !isDocs;
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <div className="h-dvh w-full bg-canvas text-ink">
      {/* Left icon rail */}
      <aside className="fixed inset-y-0 left-0 z-40 flex w-16 flex-col border-r border-line bg-surface">
        <div className="flex h-16 shrink-0 items-center justify-center border-b border-line">
          <Link
            href="/"
            aria-label="DeskYield home"
            className="grid h-9 w-9 place-items-center rounded-lg bg-pumpkin font-barlow text-lg font-extrabold text-white shadow-sm transition-colors hover:bg-pumpkin-hover"
          >
            K
          </Link>
        </div>
        <nav className="flex flex-1 flex-col items-center gap-1.5 px-2 py-4">
          {NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.label}
                href={item.href}
                title={item.label}
                aria-label={item.label}
                className={[
                  "grid h-10 w-10 place-items-center rounded-lg transition-colors",
                  active
                    ? "bg-pumpkin-subtle text-pumpkin"
                    : "text-ink-tertiary hover:bg-black/5 hover:text-ink-secondary",
                ].join(" ")}
              >
                {item.icon}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Top header */}
      <header className="fixed left-16 right-0 top-0 z-30 flex h-16 items-center justify-between border-b border-line bg-surface px-6">
        <div className="flex items-baseline gap-3">
          <h1 className="font-barlow text-2xl font-bold tracking-wide text-ink">
            {title}
          </h1>
          <span className="hidden rounded-full bg-pumpkin-subtle px-2.5 py-0.5 text-xs font-medium text-pumpkin sm:inline">
            Empty Desk Revenue Recovery
          </span>
        </div>
        <div className="text-xs font-medium text-ink-tertiary">
          DeskYield · KMC ERP
        </div>
      </header>

      {/* Content area */}
      <main className="pl-16">
        <div className="min-h-dvh pt-16">{children}</div>
      </main>
    </div>
  );
}
