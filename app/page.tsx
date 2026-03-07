"use client";
import { useNote } from "@/hooks/use-note";
import { db } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const router = useRouter();
  const { createNote } = useNote();

  const notes = useLiveQuery(() => db.localNotes.toArray());

  useEffect(() => {
    if (!notes) return;
    const lastEditedNote = notes?.sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
    )?.[0];

    if (lastEditedNote) {
      router.push(`/${lastEditedNote.id}`);
      return;
    }

    createNote();
  }, [notes]);

  return null;
}
