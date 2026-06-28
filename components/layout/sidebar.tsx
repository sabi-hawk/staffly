"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/lib/nav";

export function Sidebar({ items, role }: { items: NavItem[]; role: string }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "sticky top-0 z-20 flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-200",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* circular collapse/expand toggle straddling the right edge */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="absolute -right-3 top-20 z-30 flex h-6 w-6 items-center justify-center rounded-full border border-sidebar-border bg-white text-text-secondary shadow-card hover:text-brand-primary"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <ChevronRight className="size-3.5" /> : <ChevronLeft className="size-3.5" />}
      </button>

      <div className="flex h-16 items-center gap-2 px-4">
        <Image src="/softonoma-icon.png" alt="Softonoma" width={28} height={28} className="shrink-0" />
        {!collapsed && (
          <div className="leading-tight">
            <div className="text-sm font-semibold text-text-primary">Softonoma</div>
            <div className="text-[10px] uppercase tracking-wide text-text-secondary">Employee Portal</div>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1 px-2 py-3">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
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

      {!collapsed && (
        <div className="border-t border-sidebar-border px-4 py-3 text-caption capitalize text-text-secondary">
          {role.replace("_", " ")}
        </div>
      )}
    </aside>
  );
}
