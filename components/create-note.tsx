"use client";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { Button } from "./ui/button";
import { useNote } from "@/hooks/use-note";

export default function CreateNoteBtn() {
  const createNote = useNote((state) => state.createNote);

  const router = useRouter();

  const createNoteHandler = () => {
    const newId = uuidv4();
    createNote(newId);
    router.push(`/${newId}`);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="cursor-pointer"
      onClick={createNoteHandler}
    >
      <Plus />
    </Button>
  );
}
