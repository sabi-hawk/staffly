"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { FloatInput, FloatTextarea } from "@/components/ui/field";

export function AnnouncementForm({ authorId }: { authorId: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return toast.error("Title required");
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("announcements").insert({ title, body_text: body || null, author_id: authorId });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Announcement posted");
    setTitle(""); setBody("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <FloatInput
        label="Title"
        hint="A short headline everyone sees, e.g. Office closed on Friday."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <FloatTextarea
        label="Message"
        hint="The full announcement text shown under the title. Optional for short notices."
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
      />
      <Button type="submit" disabled={busy}>{busy ? "Posting…" : "Post announcement"}</Button>
    </form>
  );
}
