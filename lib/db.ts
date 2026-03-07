// db.ts
import { Dexie, type EntityTable } from "dexie";
import "./persist-storage";
import yDexie from "y-dexie";
import * as Y from "yjs";

interface Note {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  pinned: boolean;
  isPublic: boolean;
  isSynced: boolean;
  content: Y.Doc;
}
// export interface YjsUpdate {
//   id?: number;
//   guid: string; // y-dexie looks for this
//   content: Y.Doc;
// }

const db = new Dexie("NotesDatabase", {
  addons: [yDexie],
}) as Dexie & {
  localNotes: EntityTable<Note, "id">;
  syncedNotes: EntityTable<Note, "id">;
  publicNotes: EntityTable<Note, "id">;
};

// Schema declaration:
db.version(1).stores({
  localNotes:
    "id, name, createdAt, updatedAt, pinned, isPublic, isSynced, content: Y.Doc",
  syncedNotes:
    "id, name, createdAt, updatedAt, pinned, isPublic, isSynced, content: Y.Doc",
  publicNotes:
    "id, name, createdAt, updatedAt, pinned, isPublic, isSynced, content: Y.Doc",
});

// await db.delete();

export type { Note };
export { db };
