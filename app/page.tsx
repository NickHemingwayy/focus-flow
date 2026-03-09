"use client";
import { useNote } from "@/hooks/use-note";
import { NoteRecord } from "@/lib/powersync/app-schema";
import { useQuery } from "@powersync/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const router = useRouter();
  const { createNote } = useNote();

  const { data: notes, isLoading } = useQuery(
    "SELECT id FROM notes ORDER BY updated_at DESC LIMIT 1",
  );

  useEffect(() => {
    if (isLoading) return;
    if (!notes.length) {
      createNote(); // This will redirect to the new note
    }
    const lastEditedNote = notes[0] as NoteRecord;
    router.push(`/${lastEditedNote.id}`);
  }, [notes, isLoading]);

  return null;
}
