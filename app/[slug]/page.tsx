"use client";
import NotePad from "@/components/notepad";
import { useNote } from "@/hooks/use-note";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";
import { useLiveQuery } from "dexie-react-hooks";
import { useParams, useRouter } from "next/navigation";
import { use, useEffect, useRef, useState } from "react";

export default function Note() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();

  const slug = params?.slug;

  const titleRef = useRef<HTMLHeadingElement>(null);

  const { renameNote } = useNote();
  const activeNote = useLiveQuery(async () => {
    const localNote = await db.localNotes.get(slug);
    const syncedNote = await db.syncedNotes.get(slug);
    const note = localNote ?? syncedNote;
    return note ?? null;
  }, [slug]);

  useEffect(() => {
    if (activeNote === null) {
      router.push("/"); // Redirect to the homepage
    }
  }, [activeNote, router]);

  const handleRenameNote = (name: string) => {
    if (!activeNote) return;
    renameNote(slug, name, activeNote.isSynced);
  };

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
            handleRenameNote(text);
          }}
        />
      </div>
      {activeNote && <NotePad key={activeNote?.id} noteId={activeNote?.id} />}
    </div>
  );
}
