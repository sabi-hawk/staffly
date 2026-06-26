"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronLeft, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/lib/nav";

export function Sidebar({ items, role }: { items: NavItem[]; role: string }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "sticky top-0 flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-200",
        collapsed ? "w-16" : "w-60"
      )}
    >
      <div className="flex h-16 items-center gap-2 px-4">
        <Image src="/softonoma-icon.png" alt="Softonoma" width={28} height={28} className="shrink-0" />
        {!collapsed && (
          <div className="leading-tight">
            <div className="text-sm font-semibold text-text-primary">Softonoma</div>
            <div className="text-[10px] uppercase tracking-wide text-text-secondary">Employee Portal</div>
          </div>
        )}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="ml-auto rounded-md p-1.5 text-text-secondary hover:bg-sidebar-muted"
          aria-label="Toggle sidebar"
        >
          {collapsed ? <Menu className="size-4" /> : <ChevronLeft className="size-4" />}
        </button>
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
