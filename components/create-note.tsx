"use client";
import { useNote } from "@/hooks/use-note";
import { Plus } from "lucide-react";
import { Button } from "./ui/button";

export default function CreateNoteBtn() {
  const { createNote } = useNote();

  return (
    <Button
      variant="ghost"
      size="sm"
      className="cursor-pointer"
      onClick={createNote}
    >
      <Plus />
    </Button>
  );
}
