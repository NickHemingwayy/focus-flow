"use client";
import NotePad from "@/components/notepad";
import { useNote } from "@/hooks/use-note";
import { NoteRecord } from "@/lib/powersync/app-schema";
import { cn } from "@/lib/utils";
import { usePowerSync, useQuery } from "@powersync/react";
import debounce from "lodash.debounce";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

export default function Note() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();

  const slug = params?.slug as string;

  const titleRef = useRef<HTMLHeadingElement>(null);

  const { renameNote } = useNote();

  const [isPending, startTransition] = useTransition();
  const [activeNote, setActiveNote] = useState<NoteRecord | null>(null);
  const { data: notes, isLoading } = useQuery(
    "SELECT * FROM notes where id = ?",
    [slug],
  );

  useEffect(() => {
    if (notes && notes.length > 0) {
      startTransition(() => {
        setActiveNote(notes[0] as NoteRecord);
      });
    }
  }, [notes]);

  useEffect(() => {
    if (!isLoading && !notes.length) {
      router.push("/"); // Redirect to the homepage
      toast.error("Note not found", {
        position: "top-right",
      });
    }
  }, [notes, isLoading]);

  const handleRenameNote = debounce((name: string) => {
    if (!activeNote) return;
    renameNote(slug, name);
  }, 300);

  useEffect(() => {
    if (titleRef.current && activeNote) {
      // Only update if the text is actually different to avoid cursor jumps
      if (titleRef.current.textContent !== activeNote.name) {
        titleRef.current.textContent = activeNote.name || "";
      }
    }
  }, [activeNote?.id, activeNote?.name]);

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
            debounce;
            handleRenameNote(text);
          }}
        />
      </div>
      {activeNote && <NotePad key={activeNote?.id} note={activeNote} />}
    </div>
  );
}
