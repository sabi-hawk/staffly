"use client";
import Link from "next/link";
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
        "sticky top-0 flex h-screen flex-col bg-sidebar text-slate-300 transition-all duration-200",
        collapsed ? "w-16" : "w-60"
      )}
    >
      <div className="flex h-16 items-center gap-2 px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-primary font-bold text-white">
          S
        </div>
        {!collapsed && <span className="text-base font-semibold text-white">Staffly</span>}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="ml-auto rounded-md p-1.5 text-slate-400 hover:bg-white/10"
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
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active ? "bg-brand-primary text-white" : "text-slate-300 hover:bg-white/10 hover:text-white"
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
        <div className="px-4 py-3 text-caption capitalize text-slate-500">
          {role.replace("_", " ")}
        </div>
      )}
    </aside>
  );
}
