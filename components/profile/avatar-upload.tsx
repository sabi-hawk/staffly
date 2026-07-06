"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { avatarUrl } from "@/lib/utils";
import { FileInput } from "@/components/ui/file-input";

/** Avatar with a styled photo picker; uploads as soon as a file is chosen. employeeId omitted = self. */
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
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0); // remount FileInput after each upload attempt
  const [src, setSrc] = useState(avatarUrl(current, gender));

  async function upload(f: File) {
    setBusy(true);
    const fd = new FormData();
    fd.append("file", f);
    if (employeeId) fd.append("employeeId", employeeId);
    const res = await fetch("/api/upload/avatar", { method: "POST", body: fd });
    const json = await res.json();
    setBusy(false);
    setFile(null);
    setFileKey((k) => k + 1);
    if (!res.ok) return toast.error(json.error ?? "Upload failed");
    setSrc(json.avatar_url);
    toast.success("Photo updated");
    router.refresh();
  }

  return (
    <div className="flex flex-col items-start gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        style={{ width: size, height: size }}
        className="rounded-full border border-border object-cover"
      />
      <FileInput
        key={fileKey}
        file={file}
        disabled={busy}
        accept="image/png,image/jpeg,image/webp"
        placeholder={busy ? "Uploading…" : "Update photo"}
        className="w-56"
        onChange={(f) => { setFile(f); if (f) upload(f); }}
      />
    </div>
  );
}
