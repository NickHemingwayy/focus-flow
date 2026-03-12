import { NoteRecord } from "@/lib/powersync/app-schema";
import { usePowerSync, useQuery } from "@powersync/react";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";

const useNote = () => {
  const router = useRouter();
  const powersync = usePowerSync();

  const { data: syncedIds } = useQuery(
    "SELECT id FROM syncedNotes ORDER BY updated_at DESC",
  );

  const getTableName = (noteId: string) => {
    const isSynced = syncedIds.some((o) => o.id === noteId);
    return isSynced ? "syncedNotes" : "localNotes";
  };

  const createNote = async () => {
    try {
      const id = uuidv4();

      await powersync.execute(
        "INSERT INTO localNotes (id, name, created_at, updated_at, is_pinned, is_public) VALUES (?, ?, ?, ?, ?, ?)",
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
    const table = getTableName(id);
    await powersync.execute(`DELETE FROM ${table} WHERE id = ?`, [id]);
    toast.success("Note deleted successfully", {
      position: "top-right",
    });
  };

  const renameNote = async (id: string, name: string) => {
    try {
      const table = getTableName(id);
      await powersync.execute(
        `UPDATE ${table} SET name = ?, updated_at = ? WHERE id = ?`,
        [name, dayjs().format(), id],
      );
    } catch (error) {
      console.log(error);
      toast.error("Oops! Error renaming note", {
        position: "top-right",
      });
    }
  };
  const moveNote = async (id: string, parentId: string) => {
    try {
      const table = getTableName(id);
      await powersync.execute(
        `UPDATE ${table} SET parent_id = ? WHERE id = ?`,
        [parentId, id],
      );
      toast.success("Note moved successfully", {
        position: "top-right",
      });
    } catch (error) {
      console.log(error);
      toast.error("Oops! Error moving note", {
        position: "top-right",
      });
    }
  };
  /**
   * @param noteId The ID of the note to transition
   */
  async function pinNote(noteId: string) {
    try {
      const table = getTableName(noteId);
      await powersync.execute(
        `UPDATE ${table} SET is_pinned = 1 WHERE id = ?`,
        [noteId],
      );
      toast.success("Note pinnned", {
        position: "top-right",
      });
    } catch (error) {
      toast.error("Oops! Error pinning note", {
        position: "top-right",
      });
    }
  }
  /**
   * @param noteId The ID of the note to transition
   */
  async function unPinNote(noteId: string) {
    try {
      const table = getTableName(noteId);
      await powersync.execute(
        `UPDATE ${table} SET is_pinned = 0 WHERE id = ?`,
        [noteId],
      );
      toast.success("Note unpinned pinnned", {
        position: "top-right",
      });
    } catch (error) {
      toast.error("Oops! Error unpinning note", {
        position: "top-right",
      });
    }
  }

  /**
   * Atomically moves a note from localNotes to syncedNotes
   * @param noteId The ID of the note to transition
   */
  async function transitionNoteToCloud(noteId: string) {
    try {
      console.log("transitionNoteToCloud");
      await powersync.writeTransaction(async (tx) => {
        // Get the item from the local notes table
        const qr = await tx.execute(`SELECT * FROM localNotes WHERE id = ?`, [
          noteId,
        ]);
        const item = qr.rows?.item(0) as NoteRecord;
        // Delete from teh local notes table
        await tx.execute(`DELETE FROM localNotes WHERE id = ?`, [noteId]);
        // Insert into the synced notes table
        await tx.execute(
          `INSERT INTO syncedNotes (id, name, created_at, updated_at, is_pinned, is_public, content, parent_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            item.id,
            item.name,
            item.created_at,
            item.updated_at,
            item.is_pinned,
            item.is_public,
            item.content,
            item.parent_id,
          ],
        );
        toast.success("Note synced to cloud", {
          position: "top-right",
        });
        // Transactions are automatically committed at the end of execution
        // Transactions are automatically rolled back if an exception occurred
      });
    } catch (error) {
      console.log(error);
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
      await powersync.writeTransaction(async (tx) => {
        // Get the item from the local notes table
        const qr = await tx.execute(`SELECT * FROM syncedNotes WHERE id = ?`, [
          noteId,
        ]);
        const item = qr.rows?.item(0) as NoteRecord;
        // Delete from teh local notes table
        await tx.execute(`DELETE FROM syncedNotes WHERE id = ?`, [noteId]);
        // Insert into the synced notes table
        await tx.execute(
          `INSERT INTO localNotes (id, name, created_at, updated_at, is_pinned, is_public, content, parent_id) VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
          [
            item.id,
            item.name,
            item.created_at,
            item.updated_at,
            item.is_pinned,
            item.is_public,
            item.content,
            item.parent_id,
          ],
        );
        toast.success("Note is now local only", {
          position: "top-right",
        });
        // Transactions are automatically committed at the end of execution
        // Transactions are automatically rolled back if an exception occurred
      });
    } catch (error) {
      console.log(error);
      toast.error("Oops! Error transitioning to local only", {
        position: "top-right",
      });
    }
  }

  /**
   * Atomically moves a note from localNotes to syncedNotes
   * @param noteId The ID of the note to transition
   */
  async function transitionNoteToPublic(noteId: string) {
    try {
      const table = getTableName(noteId);
      if (table !== "syncedNotes") {
        await transitionNoteToCloud(noteId);
      }
      await powersync.execute(
        `UPDATE syncedNotes SET is_public = 1 WHERE id = ?`,
        [noteId],
      );
      toast.success("Note is now publicly accessible", {
        position: "top-right",
      });
    } catch (error) {
      toast.error("Oops! Error making note public", {
        position: "top-right",
      });
    }
  }

  /**
   * Atomically moves a note from localNotes to syncedNotes
   * @param noteId The ID of the note to transition
   */
  async function transitionNoteToPrivate(noteId: string) {
    try {
      await powersync.execute(
        "UPDATE syncedNotes SET is_public = 0 WHERE id = ?",
        [noteId],
      );
      toast.success("Note is no longer publicly accessible", {
        position: "top-right",
      });
    } catch (error) {
      toast.error("Oops! Error making note private", {
        position: "top-right",
      });
    }
  }

  return {
    syncedIds,
    createNote,
    deleteNote,
    renameNote,
    pinNote,
    unPinNote,
    moveNote,
    transitionNoteToCloud,
    transitionNoteToLocal,
    transitionNoteToPublic,
    transitionNoteToPrivate,
  };
};

export { useNote };
