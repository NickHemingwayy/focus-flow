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

  const deleteNote = async (id: string, isSynced: boolean) => {
    if (isSynced) {
      await db.syncedNotes.delete(id);
    } else {
      await db.localNotes.delete(id);
    }
    toast.success("Note deleted successfully", {
      position: "top-right",
    });
  };

  const renameNote = async (id: string, name: string, isSynced: boolean) => {
    try {
      if (isSynced) {
        await db.syncedNotes.update(id, {
          name,
        });
      } else {
        await db.localNotes.update(id, {
          name,
        });
      }
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
    return await db.transaction(
      "rw",
      [db.localNotes, db.syncedNotes],
      async () => {
        // 1. Find the note in the local table
        const note = await db.localNotes.get(noteId);

        if (!note) {
          throw new Error("Note not found in local storage.");
        }

        // 2. Prepare the note for the cloud
        const syncedNote: Note = {
          ...note,
          isSynced: true, // Update the flag
          updatedAt: new Date(),
        };

        // 3. Add to syncedNotes and Delete from localNotes
        // By doing this inside the transaction, if one fails, both fail.
        await db.syncedNotes.add(syncedNote);
        await db.localNotes.delete(noteId);

        return syncedNote;
      },
    );
  }

  /**
   * Atomically moves a note from syncedNotes to localNotes
   * @param noteId The ID of the note to move back to local-only storage
   */
  async function transitionNoteToLocal(noteId: string) {
    return await db.transaction(
      "rw",
      [db.localNotes, db.syncedNotes],
      async () => {
        // 1. Find the note in the synced table
        const note = await db.syncedNotes.get(noteId);

        if (!note) {
          throw new Error("Note not found in synced storage.");
        }

        // 2. Prepare the note for local storage
        const localNote: Note = {
          ...note,
          isSynced: false,
          isPublic: false, // Usually, if it's local, it shouldn't be public
          updatedAt: new Date(),
        };

        // 3. Add to localNotes and Delete from syncedNotes
        // This ensures the note is never "lost" during the swap
        await db.localNotes.add(localNote);
        await db.syncedNotes.delete(noteId);

        return localNote;
      },
    );
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
