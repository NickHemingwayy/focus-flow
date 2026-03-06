"use client";
import NotePad from "@/components/notepad";
import { useNote } from "@/hooks/use-note";
import { cn } from "@/lib/utils";
import { useParams, notFound, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";

export default function Note() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  // params will be { slug: 'value-from-url' }
  const slug = params?.slug;

  const notes = useNote((state) => state.notes);
  const updateNote = useNote((state) => state.updateNote);
  const hasHydrated = useNote((state) => state.hasHydrated);
  const renameNote = useNote((state) => state.renameNote);

  const titleRef = useRef<HTMLHeadingElement>(null);

  const activeNote = useMemo(() => {
    if (!hasHydrated) return;
    if (!slug || !notes) return null;

    const note = notes.find((note) => note.id === slug);

    if (!note) {
      router.push(`/`);
    }

    return note;
  }, [notes, slug, hasHydrated]);

  const docString = activeNote?.content || "";

  useEffect(() => {
    if (titleRef.current && activeNote) {
      // Only update if the text is actually different to avoid cursor jumps
      if (titleRef.current.textContent !== activeNote.name) {
        titleRef.current.textContent = activeNote.name || "";
      }
    }
  }, [activeNote?.id]);

  if (!activeNote) return <></>;

  return (
    <div className="h-screen font-sans dark:bg-zinc-900 flex-1 max-w-[1012px] mx-auto">
      <div className="milkdown pt-20 relative">
        <span></span>
        <h1
          ref={titleRef}
          contentEditable
          suppressContentEditableWarning
          data-placeholder="New note"
          className={cn(
            "ProseMirror text-5xl font-bold pb-3! outline-hidden",
            "empty:before:content-[attr(data-placeholder)]",
            "empty:before:text-muted-foreground/50",
            "empty:before:pointer-events-none",
          )}
          onInput={(e) => {
            const text = e.currentTarget.textContent || "";
            if (text === "") {
              e.currentTarget.innerHTML = "";
            }
            renameNote(activeNote?.id, text);
          }}
        />
      </div>
      <NotePad
        key={activeNote?.id}
        value={docString}
        onChange={(docString) => updateNote(activeNote.id, docString)}
      />
    </div>
  );
}
