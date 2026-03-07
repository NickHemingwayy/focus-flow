import { db, Note } from "@/lib/db";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";

const useNote = () => {
  const router = useRouter();

  const createNote = async () => {
    try {
      const newNote = {
        id: uuidv4(),
        name: "",
        pinned: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        isPublic: false,
        isSynced: false,
      };

      const id = await db.localNotes.add(newNote);
      router.push(`/${id}`);
      toast.success("Note created successfully", {
        position: "top-right",
      });
    } catch (error) {
      console.log(error);
      toast.error("Oops! Error creating note", {
        position: "top-right",
      });
    }
  };

  const deleteNote = async (id: string) => {
    try {
      await db.localNotes.delete(id);
      toast.success("Note deleted successfully", {
        position: "top-right",
      });
    } catch (error) {
      console.log(error);
      toast.error("Oops! Error deleting note", {
        position: "top-right",
      });
    }
  };

  const renameNote = async (id: string, name: string) => {
    try {
      await db.localNotes.update(id, {
        name,
      });
    } catch (error) {
      console.log(error);
      toast.error("Oops! Error renaming note", {
        position: "top-right",
      });
    }
  };

  const addToSyncStore = async (note: Note) => {
    const isPublic = note.isPublic;
    const isSynced = note.isSynced;

    if (isSynced || isPublic) return;
  };

  return {
    createNote,
    deleteNote,
    renameNote,
  };
};

export { useNote };
