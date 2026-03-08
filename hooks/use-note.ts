import { db, Note } from "@/lib/db";
import { usePowerSync } from "@powersync/react";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";

const useNote = () => {
  const router = useRouter();
  const powersync = usePowerSync();

  const createNote = async () => {
    try {
      const id = uuidv4();

      await powersync.execute(
        "INSERT INTO notes (id, name, created_at, updated_at, is_pinned, is_public, is_synced) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [id, "", dayjs().format(), dayjs().format(), 0, 0, 0],
      );
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
    await powersync.execute("DELETE FROM notes WHERE id = ?", [id]);
    toast.success("Note deleted successfully", {
      position: "top-right",
    });
  };

  const renameNote = async (id: string, name: string) => {
    try {
      await powersync.execute("UPDATE notes SET name = ? WHERE id = ?", [
        name,
        id,
      ]);
    } catch (error) {
      console.log(error);
      toast.error("Oops! Error renaming note", {
        position: "top-right",
      });
    }
  };

  /**
   * Atomically moves a note from localNotes to syncedNotes
   * @param noteId The ID of the note to transition
   */
  async function transitionNoteToCloud(noteId: string) {
    try {
      await powersync.execute("UPDATE notes SET is_synced = 1 WHERE id = ?", [
        noteId,
      ]);
      toast.success("Note moved to cloud", {
        position: "top-right",
      });
    } catch (error) {
      toast.error("Oops! Error transitioning note", {
        position: "top-right",
      });
    }
  }

  /**
   * Atomically moves a note from syncedNotes to localNotes
   * @param noteId The ID of the note to move back to local-only storage
   */
  async function transitionNoteToLocal(noteId: string) {
    try {
      await powersync.execute("UPDATE notes SET is_synced = 0 WHERE id = ?", [
        noteId,
      ]);
      toast.success("Note moved to local", {
        position: "top-right",
      });
    } catch (error) {
      toast.error("Oops! Error transitioning note", {
        position: "top-right",
      });
    }
  }

  return {
    createNote,
    deleteNote,
    renameNote,
    transitionNoteToCloud,
    transitionNoteToLocal,
  };
};

export { useNote };
