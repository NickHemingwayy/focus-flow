import { column, Schema, Table } from "@powersync/web";
import * as v from "valibot";

export const notesSchema = v.object({
  id: v.string(),
  name: v.string(),
  created_at: v.string(),
  updated_at: v.string(),
  is_pinned: v.number(),
  is_public: v.number(),
  content: v.string(),
  parent_id: v.string(),
});

const notesDef = {
  name: column.text,
  created_at: column.text,
  updated_at: column.text,
  is_pinned: column.integer,
  is_public: column.integer,
  content: column.text,
  parent_id: column.text,
};

const localNotes = new Table(notesDef, {
  localOnly: true,
});
const syncedNotes = new Table(notesDef);

export const AppSchema = new Schema({
  localNotes,
  syncedNotes,
});

// For types
export type Database = (typeof AppSchema)["types"];
export type NoteRecord = {
  [P in keyof Database["localNotes"]]: NonNullable<Database["localNotes"][P]>;
};
export interface NoteType extends NoteRecord {
  is_synced: number;
}
