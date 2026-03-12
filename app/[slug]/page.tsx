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

  const { syncedIds, renameNote } = useNote();

  const [isPending, startTransition] = useTransition();
  const [activeNote, setActiveNote] = useState<NoteRecord | null>(null);
  // const { data: notes, isLoading } = useQuery(
  //   "SELECT * FROM localNotes where id = ?",
  //   [slug],
  // );

  const { data: notes, isLoading } = useQuery(
    "SELECT * FROM (SELECT * FROM localNotes UNION ALL SELECT * FROM syncedNotes) WHERE id = ?",
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

  const debouncedRename = useRef(
    debounce(
      (
        renameFn: (id: string, name: string) => void,
        id: string,
        name: string,
      ) => {
        renameFn(id, name);
      },
      300,
    ),
  ).current;

  useEffect(() => {
    return () => {
      debouncedRename.cancel();
    };
  }, [debouncedRename]);

  useEffect(() => {
    if (
      titleRef.current &&
      activeNote &&
      document.activeElement !== titleRef.current
    ) {
      // Only update if the text is actually different to avoid cursor jumps
      if (titleRef.current.textContent !== activeNote.name) {
        titleRef.current.textContent = activeNote.name || "";
      }
    }
  }, [activeNote?.id, activeNote?.name]);

  if (!activeNote) return <></>;

  return (
    <>
      <div className="milkdown relative">
        <span></span>
        <h1
          ref={titleRef}
          contentEditable
          suppressContentEditableWarning
          data-placeholder="New note"
          className={cn(
            "ProseMirror text-5xl font-bold pb-0! outline-hidden",
            "empty:before:content-[attr(data-placeholder)]",
            "empty:before:text-muted-foreground/50",
            "empty:before:pointer-events-none",
          )}
          onInput={(e) => {
            const text = e.currentTarget.textContent || "";
            debouncedRename(renameNote, slug, text);
          }}
        />
      </div>
      {activeNote && <NotePad key={activeNote?.id} note={activeNote} />}
    </>
  );
}
