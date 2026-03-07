// db.ts
import { Dexie, type EntityTable } from "dexie";

interface Note {
  id: number;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const db = new Dexie("NotesDatabase") as Dexie & {
  notes: EntityTable<
    Note,
    "id" // primary key "id" (for the typings only)
  >;
};

// Schema declaration:
db.version(1).stores({
  notes: "++id, name, createdAt, updatedAt", // primary key "id" (for the runtime!)
});

export type { Note };
export { db };
