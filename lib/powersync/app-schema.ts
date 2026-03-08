import { column, Schema, Table } from "@powersync/web";

const notes = new Table({
  name: column.text,
  created_at: column.text,
  updated_at: column.text,
  is_pinned: column.integer,
  is_public: column.integer,
  is_synced: column.integer,
  content: column.text,
});

export const AppSchema = new Schema({
  notes,
});

// For types
export type Database = (typeof AppSchema)["types"];
export type NoteRecord = {
  [P in keyof Database["notes"]]: NonNullable<Database["notes"][P]>;
};
