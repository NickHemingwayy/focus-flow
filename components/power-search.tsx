"use client";
import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Input } from "./ui/input";
import debounce from "lodash.debounce";
import { searchTable } from "@/lib/powersync/fts_helpers";

const PowerSearch = ({ children }: { children: React.ReactNode }) => {
  const [searchQuery, setSearchQuery] = useState("");

  const debouncedSearch = debounce(async (query: string) => {
    const localResults = await searchTable(query, "localNotes");
    const syncedResults = await searchTable(query, "syncedNotes");
    const results = [...localResults, ...syncedResults];
    console.log(results);
    return results;
  }, 300);

  useEffect(() => {
    if (searchQuery.length > 0) {
      //   searchTable(searchQuery, "localNotes").then((results) => {
      //     console.log(results);
      //   });
      //   searchTable(searchQuery, "syncedNotes").then((results) => {
      //     console.log(results);
      //   });

      //   return;

      const getResults = async (sq: string) => {
        const resulst = await debouncedSearch(sq, "localNotes");

        return [];
      };

      getResults(searchQuery).then((results) => {
        // console.log(results);
      });
    }
  }, [searchQuery]);

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="sr-only">PowerSearch</DialogTitle>
          <DialogDescription className="sr-only">
            Power search is a feature that allows you to search for notes using
            a full-text search engine.
          </DialogDescription>
        </DialogHeader>
        <Input
          placeholder="Search notes..."
          className="mb-4 bg-background rounded-none border-x-0 border-t-0 focus-visible:ring-0"
          //   value={searchQuery}
          onChange={async (e) => {
            debouncedSearch(e.target.value);
            // setSearchQuery(e.target.value);
          }}
        />
      </DialogContent>
    </Dialog>
  );
};

export default PowerSearch;
