"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/lib/nav";

function Brand({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="flex h-16 items-center gap-2 px-4">
      <Image src="/softonoma-icon.png" alt="Softonoma" width={28} height={28} className="shrink-0" />
      {!collapsed && (
        <div className="leading-tight">
          <div className="text-sm font-semibold text-text-primary">Softonoma</div>
          <div className="text-[10px] uppercase tracking-wide text-text-secondary">Employee Portal</div>
        </div>
      )}
    </div>
  );
}

function NavLinks({
  items,
  collapsed,
  onNavigate,
}: {
  items: NavItem[];
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <nav className="flex-1 space-y-1 px-2 py-3">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-brand-light text-brand-primary"
                : "text-text-secondary hover:bg-sidebar-muted hover:text-text-primary"
            )}
            title={item.label}
          >
            <item.icon className="size-4 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

function RoleFooter({ role }: { role: string }) {
  return (
    <div className="border-t border-sidebar-border px-4 py-3 text-caption capitalize text-text-secondary">
      {role.replace("_", " ")}
    </div>
  );
}

export function Sidebar({
  items,
  role,
  mobileOpen = false,
  onClose,
}: {
  items: NavItem[];
  role: string;
  mobileOpen?: boolean;
  onClose?: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {/* Desktop rail (md+): collapsible, sticky. Hidden on mobile. */}
      <aside
        className={cn(
          "sticky top-0 z-20 hidden h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-200 md:flex",
          collapsed ? "w-16" : "w-60"
        )}
      >
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="absolute -right-3 top-20 z-30 flex h-6 w-6 items-center justify-center rounded-full border border-sidebar-border bg-white text-text-secondary shadow-card hover:text-brand-primary"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="size-3.5" /> : <ChevronLeft className="size-3.5" />}
        </button>
        <Brand collapsed={collapsed} />
        <NavLinks items={items} collapsed={collapsed} />
        {!collapsed && <RoleFooter role={role} />}
      </aside>

      {/* Mobile off-canvas drawer (below md). Backdrop + slide-in panel. */}
      <div className={cn("md:hidden", mobileOpen ? "" : "pointer-events-none")} aria-hidden={!mobileOpen}>
        <div
          className={cn(
            "fixed inset-0 z-40 bg-black/40 transition-opacity duration-200",
            mobileOpen ? "opacity-100" : "opacity-0"
          )}
          onClick={onClose}
        />
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-200",
            // `invisible` (visibility:hidden) when closed removes the off-screen close button + nav
            // links from BOTH the a11y tree and keyboard tab order — aria-hidden alone leaves them
            // tabbable, and react-dom 18.3's boolean `inert` doesn't serialize reliably.
            mobileOpen ? "visible translate-x-0" : "invisible -translate-x-full"
          )}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
          inert={!mobileOpen}
        >
          <button
            onClick={onClose}
            className="absolute right-3 top-4 z-10 rounded-md p-1.5 text-text-secondary hover:bg-sidebar-muted"
            aria-label="Close menu"
          >
            <X className="size-4" />
          </button>
          <Brand collapsed={false} />
          <NavLinks items={items} collapsed={false} onNavigate={onClose} />
          <RoleFooter role={role} />
        </aside>
      </div>
    </>
  );
}
