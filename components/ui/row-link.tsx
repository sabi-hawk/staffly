"use client";
// A table row that navigates on click (whole row is clickable), while letting inner links/buttons work
// (they stop propagation). Matches the TR styling.
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export function RowLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <tr
      onClick={(e) => {
        // ignore clicks that originate on an interactive child (link, button, input)
        if ((e.target as HTMLElement).closest("a,button,input,select")) return;
        router.push(href);
      }}
      className={cn("cursor-pointer border-b border-border last:border-0 hover:bg-surface/60", className)}
    >
      {children}
    </tr>
  );
}
