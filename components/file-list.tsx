"use client";
import { useNote } from "@/hooks/use-note";
import { NoteRecord } from "@/lib/powersync/app-schema";
import { cn } from "@/lib/utils";
import { useQuery } from "@powersync/react";
import dayjs from "dayjs";
import {
  Cloud,
  CloudDownload,
  FileText,
  Globe,
  GlobeX,
  MoveUpRight,
  Pin,
  SquarePen,
  Trash,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import React, { memo, useEffect, useState } from "react";
import { Button } from "./ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "./ui/context-menu";
import { Input } from "./ui/input";
import debounce from "lodash.debounce";

const UsersFileList = () => {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;

  const [activeId, setActiveId] = useState<string | null>(slug);

  useEffect(() => {
    setActiveId(slug);
  }, [slug]);

  const { data: notes } = useQuery(
    "SELECT id, name, updated_at, is_pinned, is_synced, is_public FROM notes ORDER BY updated_at DESC",
  );

  const pinnedNotes = (notes || []).filter((note) => note.is_pinned === 1);
  const localNotes = (notes || [])
    .filter((note) => note.is_synced === 0)
    .slice(0, 5);
  const syncedNotes = (notes || [])
    .filter((note) => note.is_synced === 1)
    .slice(0, 5);
  const publicNotes = (notes || []).filter((note) => note.is_public === 1);

  return (
    <div className="flex flex-col">
      <span className="text-muted-foreground ps-3 text-xs block mt-4 flex font-bold">
        Pinned files
      </span>

      {pinnedNotes?.map((note) => (
        <FileListItem
          note={note}
          slug={slug}
          key={`pinned-${note.id}`}
          activeId={activeId}
          setActiveId={setActiveId}
        />
      ))}
      <span className="text-muted-foreground ps-3 text-xs block mt-4 font-bold">
        Local files
      </span>
      {localNotes?.map((note) => (
        <FileListItem
          note={note}
          slug={slug}
          key={`local-${note.id}`}
          activeId={activeId}
          setActiveId={setActiveId}
        />
      ))}
      <span className="text-muted-foreground ps-3 text-xs block mt-4 font-bold">
        Synced files
      </span>
      {syncedNotes?.map((note) => (
        <FileListItem
          note={note}
          slug={slug}
          key={`synced-${note.id}`}
          activeId={activeId}
          setActiveId={setActiveId}
        />
      ))}
      <span className="text-muted-foreground ps-3 text-xs block mt-4 font-bold">
        Public files
      </span>
      {publicNotes?.map((note) => (
        <FileListItem
          note={note}
          slug={slug}
          key={`public-${note.id}`}
          activeId={activeId}
          setActiveId={setActiveId}
        />
      ))}
    </div>
  );
};

const FileListItem = memo(
  ({
    note,
    activeId,
    setActiveId,
  }: {
    note: NoteRecord;
    slug?: string;
    activeId: string | null;
    setActiveId: (id: string | null) => void;
  }) => {
    const isActive = activeId === note.id;

    const {
      deleteNote,
      renameNote,
      pinNote,
      transitionNoteToCloud,
      transitionNoteToLocal,
      transitionNoteToPublic,
      transitionNoteToPrivate,
    } = useNote();

    const handleRenameNote = debounce((name: string) => {
      renameNote(note.id, name);
    }, 300);

    const [editingNoteName, setEditingNoteName] = useState(false);

    const isPublic = note.is_public === 1;
    const isSynced = note.is_synced === 1;

    return (
      <React.Fragment>
        <ContextMenu
          onOpenChange={(oc) => {
            // Prevents flash of context menu when closing
            setTimeout(() => {
              if (oc == false) {
                setEditingNoteName(false);
              }
            }, 100);
          }}
        >
          <ContextMenuTrigger asChild>
            <Button
              variant={isActive ? "secondary" : "ghost"}
              className={cn(
                "justify-start max-w-full",
                !isActive && "text-muted-foreground",
              )}
              asChild
            >
              <Link href={`/${note.id}`} onClick={() => setActiveId(note.id)}>
                <FileText />
                <span className="truncate inline-block">
                  {note.name || "Untitled"}
                </span>
              </Link>
            </Button>
          </ContextMenuTrigger>
          <ContextMenuContent>
            {!editingNoteName ? (
              <>
                <ContextMenuGroup>
                  <ContextMenuItem
                    onClick={() => {
                      pinNote(note.id);
                    }}
                  >
                    <Pin />
                    Pin to favourites
                  </ContextMenuItem>
                  <ContextMenuItem
                    onClick={(e) => {
                      e.preventDefault();
                      setEditingNoteName(true);
                    }}
                  >
                    <SquarePen />
                    Rename
                  </ContextMenuItem>

                  <ContextMenuItem asChild>
                    <Link href={`/${note.id}`} target="_blank">
                      <MoveUpRight />
                      Open in new tab
                    </Link>
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => deleteNote(note.id)}>
                    <Trash />
                    Trash
                  </ContextMenuItem>
                </ContextMenuGroup>
                <ContextMenuSeparator />
                <ContextMenuGroup>
                  {!isSynced && (
                    <ContextMenuItem
                      onClick={() => transitionNoteToCloud(note.id)}
                    >
                      <Cloud />
                      Add to sync store
                    </ContextMenuItem>
                  )}
                  {isSynced && (
                    <ContextMenuItem
                      onClick={() => transitionNoteToLocal(note.id)}
                    >
                      <CloudDownload />
                      Remove from sync store
                    </ContextMenuItem>
                  )}

                  {!isPublic && (
                    <ContextMenuItem
                      onClick={() => transitionNoteToPublic(note.id)}
                    >
                      <Globe />
                      Make public
                    </ContextMenuItem>
                  )}
                  {isPublic && (
                    <ContextMenuItem
                      onClick={() => transitionNoteToPrivate(note.id)}
                    >
                      <GlobeX />
                      Unpublish
                    </ContextMenuItem>
                  )}
                </ContextMenuGroup>
                <ContextMenuSeparator />
                <span className="text-xs text-muted-foreground px-2 pb-1 block">
                  Last edited{" "}
                  {dayjs(note.updated_at).format("MMM D, YYYY, h:mm A")}
                </span>
              </>
            ) : (
              <Input
                defaultValue={note.name}
                autoFocus
                onChange={(e) => {
                  handleRenameNote(e.target.value);
                }}
              />
            )}
          </ContextMenuContent>
        </ContextMenu>
      </React.Fragment>
    );
  },
);

export default UsersFileList;
