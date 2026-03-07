import { db } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const useNote = () => {
  const notes = useLiveQuery(() => db.notes.toArray());
  const router = useRouter();

  const createNote = async () => {
    try {
      const newNote = {
        name: "Untitled",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      console.log("newNote: ", newNote);

      const id = await db.notes.add(newNote);
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

  const deleteNote = async (id: number) => {
    try {
      await db.notes.delete(id);
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

  const renameNote = async (id: number, name: string) => {
    try {
      await db.notes.update(id, {
        name,
      });
    } catch (error) {
      console.log(error);
      toast.error("Oops! Error renaming note", {
        position: "top-right",
      });
    }
  };

  return {
    notes,
    createNote,
    deleteNote,
    renameNote,
  };
};

export { useNote };
