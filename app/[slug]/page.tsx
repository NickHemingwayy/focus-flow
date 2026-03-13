"use client";
import NotePad from "@/components/notepad";

import { useNote } from "@/hooks/use-note";
import { NoteRecord, NoteType } from "@/lib/powersync/app-schema";
import { cn } from "@/lib/utils";
import { useQuery } from "@powersync/react";
import debounce from "lodash.debounce";
import { useParams, useRouter } from "next/navigation";
import { Fragment, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";

export default function Note() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();

  const slug = params?.slug as string;

  const titleRef = useRef<HTMLHeadingElement>(null);

  const { renameNote } = useNote();

  const [isPending, startTransition] = useTransition();
  const [activeNote, setActiveNote] = useState<NoteType | null>(null);

  const { data: notes, isLoading } = useQuery<NoteType>(
    `SELECT * FROM (SELECT *, 0 as is_synced FROM localNotes UNION ALL SELECT *, 1 as is_synced FROM syncedNotes) WHERE id = ?`,
    [slug],
  );

  useEffect(() => {
    if (notes && notes.length > 0) {
      startTransition(() => {
        setActiveNote(notes[0] as NoteType);
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
        renameFn: (id: string, name: string, isSynced: number) => void,
        id: string,
        name: string,
        isSynced: number,
      ) => {
        renameFn(id, name, isSynced);
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
      <div className="max-w-[800px] mx-auto relative pt-24">
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
            debouncedRename(renameNote, slug, text, activeNote.is_synced);
          }}
        />
        {activeNote && <NotePad key={activeNote?.id} note={activeNote} />}
      </div>
    </>
  );
}
