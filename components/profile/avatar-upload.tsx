"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera } from "lucide-react";
import { avatarUrl } from "@/lib/utils";

/** Avatar with hover-to-upload. employeeId omitted = self. */
export function AvatarUpload({
  current,
  gender,
  employeeId,
  size = 72,
}: {
  current: string | null;
  gender: string | null;
  employeeId?: string;
  size?: number;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [src, setSrc] = useState(avatarUrl(current, gender));

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    if (employeeId) fd.append("employeeId", employeeId);
    const res = await fetch("/api/upload/avatar", { method: "POST", body: fd });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return toast.error(json.error ?? "Upload failed");
    setSrc(json.avatar_url);
    toast.success("Photo updated");
    router.refresh();
  }

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="h-full w-full rounded-full border border-border object-cover" />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-white text-text-secondary shadow-card hover:text-brand-primary"
        aria-label="Upload photo"
      >
        <Camera className="size-3.5" />
      </button>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={onPick} />
    </div>
  );
}
