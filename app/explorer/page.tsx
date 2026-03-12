"use client";
import { Button } from "@/components/ui/button";
import { useNote } from "@/hooks/use-note";
// import { DataTable } from "./data-table";
import { columns } from "./columns";
import { use, useEffect, useMemo, useState } from "react";
import { useQuery } from "@powersync/react";
import { Input } from "@/components/ui/input";
import { Cloud, Globe, Pin } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { NoteRecord } from "@/lib/powersync/app-schema";
import { DataTable } from "./expanding-data-table";

const Explorer = () => {
  const { createNote } = useNote();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterPinned, setFilterPinned] = useState(false);
  const [filterPublic, setFilterPublic] = useState(false);
  const [filterSynced, setFilterSynced] = useState(false);

  const { data: notes } = useQuery(
    `SELECT id, COALESCE(name, 'Untitled') as name, created_at, updated_at, is_pinned, is_public, parent_id, 0 as is_synced FROM localNotes UNION ALL SELECT id, COALESCE(name, 'Untitled') as name, created_at, updated_at, is_pinned, is_public, parent_id, 1 as is_synced FROM syncedNotes ORDER BY updated_at DESC`,
  );

  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      if (filterPinned && note.is_pinned !== 1) return false;
      if (filterPublic && note.is_public !== 1) return false;
      if (filterSynced && note.is_synced !== 1) return false;
      return note.name.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [notes, searchQuery, filterPinned, filterPublic, filterSynced]);

  /**
   * Converts a flat list of notes into a nested tree structure.
   * @param {Array} notes - The data array from your useQuery.
   * @returns {Array} The nested tree of notes.
   */
  const buildNoteTree = (notes: NoteRecord[]) => {
    if (!notes) return [];

    const map = new Map();
    const roots = [];

    // 1. Initialize the map with note objects and a children array
    notes.forEach((note) => {
      map.set(note.id, { ...note, children: [] });
    });

    // 2. Link children to parents or push to roots
    for (const note of notes) {
      const node = map.get(note.id);
      const parent = map.get(note.parent_id);

      if (note.parent_id && parent) {
        // Since your SQL query is already ORDERED BY updated_at,
        // these will be pushed in that order naturally.
        parent.children.push(node);
      } else {
        // If there's no parent (or parent isn't in this result set), it's a root
        roots.push(node);
      }
    }

    return roots;
  };

  const noteTree = useMemo(() => buildNoteTree(filteredNotes), [filteredNotes]);

  const handleRowClick = (note: NoteRecord) => {
    router.push(`/${note.id}`);
  };

  return (
    <>
      <div className="flex justify-between gap-2 flex-wrap mb-8">
        <h1 className="text-5xl font-bold">Explorer</h1>
        <Button
          variant={"accent"}
          onClick={createNote}
          className="cursor-pointer"
        >
          New note
        </Button>
      </div>
      <div className="flex gap-2 mb-2">
        <Button
          variant={filterSynced ? "secondary" : "ghost"}
          className={cn(
            "rounded-full cursor-pointer",
            !filterSynced && "text-muted-foreground",
          )}
          onClick={() => {
            setFilterSynced(!filterSynced);
            setFilterPinned(false);
            setFilterPublic(false);
          }}
        >
          <Cloud /> Synced
        </Button>
        <Button
          variant={filterPublic ? "secondary" : "ghost"}
          className={cn(
            "rounded-full cursor-pointer",
            !filterPublic && "text-muted-foreground",
          )}
          onClick={() => {
            setFilterPublic(!filterPublic);
            setFilterPinned(false);
            setFilterSynced(false);
          }}
        >
          <Globe /> Public
        </Button>
        <Button
          variant={filterPinned ? "secondary" : "ghost"}
          className={cn(
            "rounded-full cursor-pointer",
            !filterPinned && "text-muted-foreground",
          )}
          onClick={() => {
            setFilterPinned(!filterPinned);
            setFilterPublic(false);
            setFilterSynced(false);
          }}
        >
          <Pin /> Pinned
        </Button>
      </div>
      <Input
        placeholder="Search notes..."
        className="mb-4 bg-background! rounded-none border-x-0 border-t-0 focus-visible:ring-0"
        value={searchQuery}
        onChange={(e) => {
          setSearchQuery(e.target.value);
        }}
      />
      <DataTable
        columns={columns}
        data={noteTree}
        onRowClick={handleRowClick}
      />
    </>
  );
};

export default Explorer;
