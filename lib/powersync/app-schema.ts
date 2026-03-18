import { column, Schema, Table } from "@powersync/web";
import * as v from "valibot";

const notesDef = {
  name: column.text,
  created_at: column.text,
  updated_at: column.text,
  is_pinned: column.integer,
  is_public: column.integer,
  content_json: column.text,
  content_text: column.text,
  parent_id: column.text,
};

const noteUpdateDef = {
  note_id: column.text,
  created_at: column.text,
  update_b64: column.text,
};

const localNotes = new Table(notesDef, {
  localOnly: true,
});
const syncedNotes = new Table(notesDef);

const noteUpdates = new Table(noteUpdateDef, {
  indexes: { by_note: ["note_id"] },
});

export const AppSchema = new Schema({
  localNotes,
  syncedNotes,
  noteUpdates,
});

// For types
export type Database = (typeof AppSchema)["types"];
export type NoteRecord = {
  [P in keyof Database["localNotes"]]: NonNullable<Database["localNotes"][P]>;
};
export interface NoteType extends NoteRecord {
  is_synced: number;
}
export type NoteUpdates = Database["noteUpdates"];
