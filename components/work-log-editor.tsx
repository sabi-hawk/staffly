"use client";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Italic, List, ListOrdered, Heading2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function WorkLogEditor({
  value,
  onChange,
}: {
  value?: unknown;
  onChange: (json: unknown) => void;
}) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: (value as object) ?? "<p></p>",
    immediatelyRender: false,
    editorProps: { attributes: { class: "tiptap prose-sm" } },
    onUpdate: ({ editor }) => onChange(editor.getJSON()),
  });

  if (!editor) return <div className="h-40 rounded-md border border-border bg-surface" />;

  const Btn = ({ on, active, children }: { on: () => void; active: boolean; children: React.ReactNode }) => (
    <button
      type="button"
      onClick={on}
      className={cn(
        "rounded p-1.5 hover:bg-surface",
        active ? "bg-brand-light text-brand-primary" : "text-text-secondary"
      )}
    >
      {children}
    </button>
  );

  return (
    <div className="rounded-md border border-border bg-white">
      <div className="flex items-center gap-1 border-b border-border p-1.5">
        <Btn on={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")}>
          <Bold className="size-4" />
        </Btn>
        <Btn on={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")}>
          <Italic className="size-4" />
        </Btn>
        <Btn
          on={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive("heading", { level: 2 })}
        >
          <Heading2 className="size-4" />
        </Btn>
        <Btn on={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")}>
          <List className="size-4" />
        </Btn>
        <Btn on={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")}>
          <ListOrdered className="size-4" />
        </Btn>
      </div>
      <div className="px-3 py-2">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

export { workLogPreview } from "@/lib/worklog";
