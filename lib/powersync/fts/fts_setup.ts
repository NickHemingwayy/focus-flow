import { Table } from "@powersync/web";

import { AppSchema } from "../app-schema";
import { db } from "@/components/providers/system-provider";
import { ExtractType, generateJsonExtracts } from "./helpers";

/**
 * Create a Full Text Search table for the given table and columns
 * with an option to use a different tokenizer otherwise it defaults
 * to unicode61. It also creates the triggers that keep the FTS table
 * and the PowerSync table in sync.
 * @param tableName
 * @param columns
 * @param tokenizationMethod
 */
async function createFtsTable(
  tableName: string,
  columns: string[],
  tokenizationMethod = "unicode61",
): Promise<void> {
  const internalName = (AppSchema.tables as Table[]).find(
    (table) => table.name === tableName,
  )?.internalName;

  const stringColumns = columns.join(", ") + ", is_synced";
  const is_synced = tableName === "localNotes" ? 0 : 1;

  return await db.writeTransaction(async (tx) => {
    // await tx.execute(`DROP TABLE IF EXISTS fts_${tableName}`);
    // Add FTS table
    await tx.execute(`
      CREATE VIRTUAL TABLE IF NOT EXISTS fts_${tableName}
      USING fts5(id UNINDEXED, ${stringColumns}, tokenize='${tokenizationMethod}');
    `);
    // Copy over records already in table
    await tx.execute(`
      INSERT OR REPLACE INTO fts_${tableName}(rowid, id, ${stringColumns})
      SELECT rowid, id, ${generateJsonExtracts(ExtractType.columnOnly, "data", columns)}, ${is_synced} as is_synced FROM ${internalName};
    `);
    // Add INSERT, UPDATE and DELETE and triggers to keep fts table in sync with table
    await tx.execute(`
      CREATE TRIGGER IF NOT EXISTS fts_insert_trigger_${tableName} AFTER INSERT ON ${internalName}
      BEGIN
        INSERT INTO fts_${tableName}(rowid, id, ${stringColumns})
        VALUES (
          NEW.rowid,
          NEW.id,
          ${generateJsonExtracts(ExtractType.columnOnly, "NEW.data", columns)}, ${is_synced}
        );
      END;
    `);
    await tx.execute(`
      CREATE TRIGGER IF NOT EXISTS fts_update_trigger_${tableName} AFTER UPDATE ON ${internalName} BEGIN
        UPDATE fts_${tableName}
        SET ${generateJsonExtracts(ExtractType.columnInOperation, "NEW.data", columns)}, is_synced = ${is_synced}
        WHERE rowid = NEW.rowid;
      END;
    `);
    await tx.execute(`
      CREATE TRIGGER IF NOT EXISTS fts_delete_trigger_${tableName} AFTER DELETE ON ${internalName} BEGIN
        DELETE FROM fts_${tableName} WHERE rowid = OLD.rowid;
      END;
    `);
  });
}

/**
 * This is where you can add more methods to generate FTS tables in this demo
 * that correspond to the tables in your schema and populate them
 * with the data you would like to search on
 */
export async function configureFts(): Promise<void> {
  await createFtsTable("localNotes", [
    "name",
    "content_text",
    "is_pinned",
    "is_public",
    "updated_at",
  ]);
  await createFtsTable("syncedNotes", [
    "name",
    "content_text",
    "is_pinned",
    "is_public",
    "updated_at",
  ]);
}
