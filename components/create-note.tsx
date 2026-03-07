"use client";
import { db } from "@/lib/db";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { useNote } from "@/hooks/use-note";

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
