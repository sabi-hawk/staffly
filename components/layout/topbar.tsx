"use client";
import { LogOut, Menu, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AlertsBell } from "@/components/crm/alerts-bell";
import { MyNotificationsBell } from "./my-notifications-bell";

export function Topbar({
  title,
  fullName,
  onMenuClick,
  showAlerts = false,
}: {
  title: string;
  fullName: string;
  onMenuClick?: () => void;
  showAlerts?: boolean;
}) {
  const router = useRouter();
  const initials = fullName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-border bg-card/80 px-4 backdrop-blur sm:px-6">
      <button
        onClick={onMenuClick}
        className="rounded-md p-2 text-text-secondary hover:bg-surface md:hidden"
        aria-label="Open menu"
      >
        <Menu className="size-5" />
      </button>
      <h1 className="text-h2 text-text-primary">{title}</h1>
      <div className="ml-auto flex items-center gap-3">
        <button
          onClick={() => window.dispatchEvent(new Event("open-command-palette"))}
          className="hidden items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 text-caption text-text-secondary transition-colors hover:border-brand-primary/50 hover:text-text-primary md:flex"
          aria-label="Search (Cmd+K)"
        >
          <Search className="size-3.5" />
          <span>Search</span>
          <kbd className="rounded bg-white px-1.5 text-[10px]">⌘K</kbd>
        </button>
        <MyNotificationsBell />
        {showAlerts && <AlertsBell />}
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-light text-caption font-semibold text-brand-primary">
          {initials}
        </div>
        <button
          onClick={signOut}
          className="rounded-md p-2 text-text-secondary hover:bg-surface"
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut className="size-4" />
        </button>
      </div>
    </header>
  );
}
