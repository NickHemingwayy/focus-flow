"use client";
import NotePad from "@/components/notepad";
import { useNote } from "@/hooks/use-note";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";
import { useLiveQuery } from "dexie-react-hooks";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

export default function Note() {
  const params = useParams<{ slug: string }>();
  // params will be { slug: 'value-from-url' }
  const slug = params?.slug;

  const titleRef = useRef<HTMLHeadingElement>(null);

  const { renameNote } = useNote();

  const activeNote = useLiveQuery(() => db.notes.get(parseInt(slug)));

  // db.on("ready", async () => {
  //   const data = await db.notes.get(parseInt(slug));
  //   console.log("DB is ready and here is the data: ", data);
  //   if (!data) {
  //     router.push(`/`);
  //   }
  //   // console.log("DB is ready and here is the data: ", data);
  // });

  // console.log(activeNote);

  const handleRenameNote = (name: string) => {
    renameNote(parseInt(slug), name);
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
      <NotePad key={activeNote?.id} noteId={activeNote?.id} />
    </div>
  );
}
