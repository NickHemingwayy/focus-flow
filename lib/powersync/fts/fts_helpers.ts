import { db } from "@/components/providers/system-provider";

/**
 * adding * to the end of the search term will match any word that starts with the search term
 * e.g. searching bl will match blue, black, etc.
 * consult FTS5 Full-text Query Syntax documentation for more options
 * @param searchTerm
 * @returns a modified search term with options.
 */
function createSearchTermWithOptions(searchTerm: string): string {
  if (!searchTerm.trim()) return "";

  // Tokenize on whitespace, then wrap each token in double quotes so FTS5
  // treats special characters as literals rather than query operators.
  // The trailing * outside the quotes enables prefix matching.
  const tokens = searchTerm.trim().split(/\s+/);
  return tokens
    .filter(Boolean)
    .map((token) => `"${token.replace(/"/g, '""')}"*`)
    .join(" ");
}
/**
 * Search the FTS table for the given searchTerm
 * @param searchTerm
 * @param tableName
 * @returns results from the FTS table
 */
export async function searchTable(
  searchTerm: string,
  tableName: string,
): Promise<any[]> {
  if (!searchTerm.trim()) return [];
  const searchTermWithOptions = createSearchTermWithOptions(searchTerm);
  return await db.getAll(
    `SELECT * FROM fts_${tableName} WHERE fts_${tableName} MATCH ? ORDER BY rank`,
    [searchTermWithOptions],
  );
}

//Used to display the search results in the autocomplete text field
export class SearchResult {
  id: string;
  name: string;
  content_md: string;

  constructor(id: string, name: string, content_md: string) {
    this.id = id;
    this.name = name;
    this.content_md = content_md;
  }
}
