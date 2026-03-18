"use client";
import { useMemo, useState } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Input } from "./ui/input";
import debounce from "lodash.debounce";
import { searchTable } from "@/lib/powersync/fts/fts_helpers";
import { NoteType } from "@/lib/powersync/app-schema";
import { useQuery } from "@powersync/react";
import { ScrollArea } from "./ui/scroll-area";
import Link from "next/link";
import { Clock, Search } from "lucide-react";
import { NoteIcon } from "./file-list";
import { Separator } from "./ui/separator";
import { formatRelativeTime } from "@/lib/utils";
import { useHotkey } from "@tanstack/react-hotkeys";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractSnippet(
  markdown: string,
  query: string,
  windowSize = 80,
): string {
  const stripped = markdown
    .replace(/[#*_`>\-\[\]!]/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\n+/g, " ")
    .trim();
  const index = stripped.toLowerCase().indexOf(query.toLowerCase());

  if (index === -1)
    return (
      stripped.slice(0, windowSize) + (stripped.length > windowSize ? "…" : "")
    );

  const start = Math.max(0, index - windowSize / 2);
  const end = Math.min(stripped.length, index + query.length + windowSize / 2);

  return (
    (start > 0 ? "…" : "") +
    stripped.slice(start, end) +
    (end < stripped.length ? "…" : "")
  );
}

function highlightMatches(
  text: string,
  query: string,
): { text: string; highlight: boolean }[] {
  if (!text) return [];
  if (!query.trim()) return [{ text, highlight: false }];

  const parts = text.split(
    new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"),
  );

  return parts
    .filter((part) => part.length > 0)
    .map((part) => ({
      text: part,
      highlight: part.toLowerCase() === query.toLowerCase(),
    }));
}

// ---------------------------------------------------------------------------
// SearchResult
// ---------------------------------------------------------------------------

const SearchResult = ({ note, query }: { note: NoteType; query: string }) => {
  const snippet = extractSnippet(note.content_text ?? "", query);
  const nameParts = highlightMatches(note.name, query);
  const snippetParts = highlightMatches(snippet, query);
  const hasContentMatch =
    !!query &&
    (note.content_text ?? "").toLowerCase().includes(query.toLowerCase());
  const relativeTime = formatRelativeTime(note.updated_at);

  return (
    <DialogClose asChild>
      <Link
        href={`/${note.id}`}
        className="
          group flex items-start gap-3 w-full rounded-lg px-3 py-2
          transition-colors duration-100 hover:bg-secondary
          focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring
        "
      >
        <span className="shrink-0 mt-0.5">
          <NoteIcon note={note} size={40} />
        </span>

        <span className="flex flex-col justify-center min-h-[40px] flex-1 min-w-0">
          {/* Name + timestamp row */}
          <span className="flex items-baseline justify-between gap-2">
            <span className="text-[13.5px] font-medium text-muted-foreground truncate leading-snug">
              {nameParts.length
                ? nameParts.map((part, i) =>
                    part.highlight ? (
                      <mark
                        key={i}
                        className="bg-transparent text-primary font-semibold"
                      >
                        {part.text}
                      </mark>
                    ) : (
                      <span key={i}>{part.text}</span>
                    ),
                  )
                : "Untitled"}
            </span>

            {relativeTime && (
              <span className="shrink-0 flex items-center gap-1 text-[11px] text-muted-foreground/50 group-hover:text-muted-foreground transition-colors">
                <Clock size={10} strokeWidth={2} />
                {relativeTime}
              </span>
            )}
          </span>

          {/* Snippet — only rendered when there's a match */}
          {hasContentMatch && snippet && (
            <span className="text-[11.5px] text-muted-foreground/60 line-clamp-1 mt-0.5 leading-snug">
              {snippetParts.map((part, i) =>
                part.highlight ? (
                  <mark
                    key={i}
                    className="bg-transparent text-primary/80 font-medium"
                  >
                    {part.text}
                  </mark>
                ) : (
                  <span key={i}>{part.text}</span>
                ),
              )}
            </span>
          )}
        </span>
      </Link>
    </DialogClose>
  );
};

// ---------------------------------------------------------------------------
// PowerSearch
// ---------------------------------------------------------------------------

const PowerSearch = ({ children }: { children: React.ReactNode }) => {
  const [searchResults, setSearchResults] = useState<NoteType[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const hasQuery = searchQuery.trim().length > 0;
  const [dialogOpen, setDialogOpen] = useState(false);

  // Open dialog on CMD+K
  useHotkey("Mod+K", () => setDialogOpen(true));

  const { data: recentNotes } = useQuery<NoteType>(
    `SELECT * FROM (
       SELECT id, name, created_at, updated_at, content_text, is_pinned, is_public, parent_id, 0 as is_synced FROM localNotes
       UNION ALL
       SELECT id, name, created_at, updated_at, content_text, is_pinned, is_public, parent_id, 1 as is_synced FROM syncedNotes
     ) ORDER BY updated_at DESC LIMIT 8`,
  );

  const results = hasQuery ? searchResults : (recentNotes ?? []);

  const debouncedSearch = useMemo(
    () =>
      debounce(async (query: string) => {
        if (!query.trim()) {
          setIsSearching(false);
          setSearchResults([]);
          return;
        }
        setIsSearching(true);
        const [localResults, syncedResults] = await Promise.all([
          searchTable(query, "localNotes"),
          searchTable(query, "syncedNotes"),
        ]);
        setSearchResults([...localResults, ...syncedResults]);
        setIsSearching(false);
      }, 300),
    [],
  );

  return (
    <Dialog
      onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) {
          setSearchQuery("");
          setSearchResults([]);
        }
      }}
      open={dialogOpen}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent
        className="
          flex flex-col p-0 gap-0 border-0
          bg-[rgba(28,28,30,0.82)] backdrop-blur-2xl
          rounded-2xl overflow-hidden
          w-[560px] max-w-[90vw]
          ring-1 ring-white/10
        "
        style={{
          boxShadow:
            "0 32px 80px rgba(0,0,0,0.6), 0 0 0 0.5px rgba(255,255,255,0.08)",
        }}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>PowerSearch</DialogTitle>
          <DialogDescription>
            Search notes by name or content using full-text search.
          </DialogDescription>
        </DialogHeader>

        {/* ── Search bar ── */}
        <div className="flex items-center gap-3 px-4 py-2 shrink-0">
          <Search size={20} />
          <Input
            placeholder="Search notes by name or content..."
            className="bg-transparent! rounded-none border-0 focus-visible:ring-0"
            onChange={(e) => {
              const val = e.target.value;
              setSearchQuery(val);
              debouncedSearch(val);
            }}
          />
          {isSearching && (
            <span className="shrink-0 w-3.5 h-3.5 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
          )}
        </div>

        {/* ── Results — only mounts when there's a query ── */}
        {hasQuery && (
          <>
            <Separator className="bg-white/[0.07] shrink-0" />

            <ScrollArea className="max-h-[360px]">
              <div className="flex flex-col px-2 py-2">
                {results.length > 0
                  ? results.map((note) => (
                      <SearchResult
                        key={note.id}
                        note={note}
                        query={searchQuery}
                      />
                    ))
                  : !isSearching && (
                      <p className="text-center text-sm text-muted-foreground/50 py-6">
                        No results for &ldquo;{searchQuery}&rdquo;
                      </p>
                    )}
              </div>
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PowerSearch;
