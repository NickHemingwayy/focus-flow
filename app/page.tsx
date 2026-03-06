"use client";
import NotePad from "@/components/notepad";
import { useNote } from "@/hooks/use-note";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { v4 as uuidv4 } from "uuid";

export default function Home() {
  const router = useRouter();
  const notes = useNote((state) => state.notes);
  const createNote = useNote((state) => state.createNote);

  const storeHasHydrated = useNote((state) => state.hasHydrated);

  /* If the user has notes, redirect to the last edited note, 
  otherwise create a new note before redirecting */

  useEffect(() => {
    if (storeHasHydrated) {
      const lastEditedNote = notes.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      )?.[0];

      if (lastEditedNote) {
        router.push(`/${lastEditedNote.id}`);
        return;
      }
      // Create note if no notes exist
      const newId = uuidv4();
      createNote(newId);
      router.push(`/${newId}`);
    }
  }, [storeHasHydrated]);

  return null;
}
