import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "brand",
}: {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  tone?: "brand" | "success" | "warning" | "danger" | "neutral";
}) {
  const tones = {
    brand: "bg-brand-light text-brand-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    danger: "bg-danger/10 text-danger",
    neutral: "bg-gray-100 text-text-secondary",
  };
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-caption text-text-secondary">{label}</p>
        {Icon && (
          <span className={cn("flex h-8 w-8 items-center justify-center rounded-md", tones[tone])}>
            <Icon className="size-4" />
          </span>
        )}
      </div>
      <p className="mt-2 text-display tabular text-text-primary">{value}</p>
    </Card>
  );
}
