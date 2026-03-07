"use client";
import { useNote } from "@/hooks/use-note";
import { db } from "@/lib/db";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const { createNote, notes } = useNote();

  /* If the user has notes, redirect to the last edited note, 
  otherwise create a new note before redirecting */

  db.on("ready", async () => {
    const notes = await db.notes.toArray();
    const lastEditedNote = notes.sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
    )?.[0];

    if (lastEditedNote) {
      router.push(`/${lastEditedNote.id}`);
      return;
    }
    const id = createNote();
    router.push(`/${id}`);
    // console.log("DB is ready and here is the data: ", data);
  });

  return null;
}
