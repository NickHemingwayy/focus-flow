"use client";
import { useNote } from "@/hooks/use-note";
import { NoteRecord } from "@/lib/powersync/app-schema";
import { cn } from "@/lib/utils";
import { useQuery } from "@powersync/react";
import dayjs from "dayjs";
import {
  Cloud,
  CloudDownload,
  CloudOff,
  FileSymlink,
  FileText,
  Globe,
  GlobeX,
  MoveUpRight,
  Pin,
  PinOff,
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
import { NoteType } from "./file-list";

const FileMoveTo = ({
  activeNote,
  handleCloseContextMenu,
}: {
  activeNote: NoteRecord;
  handleCloseContextMenu: () => void;
}) => {
  const { moveNote } = useNote();
  const [queryValue, setQueryValue] = useState("");

  const whereConditions = [`id != ?`];
  const params: any[] = [activeNote.id];

  if (queryValue.length > 0) {
    whereConditions.push(`(name LIKE ? OR id LIKE ?)`);
    params.push(`%${queryValue}%`, `%${queryValue}%`);
  }

  const whereClause =
    whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

  const { data: notes, isLoading } = useQuery(
    `SELECT id, name FROM (
        SELECT id, name, updated_at FROM localNotes
        UNION ALL
        SELECT id, name, updated_at FROM syncedNotes
      ) ${whereClause} ORDER BY updated_at DESC`,
    params,
  );

  return (
    <>
      <Input
        placeholder="Move to..."
        className="focus-visible:ring-0 w-64"
        value={queryValue}
        onChange={(e) => setQueryValue(e.target.value)}
      />
      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <div className="flex flex-col">
          {notes.map((note) => (
            <Button
              key={note.id}
              variant={"ghost"}
              className="justify-start text-muted-foreground"
              disabled={note.id == activeNote.parent_id}
              onClick={() => {
                moveNote(activeNote.id, note.id);
                handleCloseContextMenu();
              }}
            >
              <FileText />
              {note.name || "Untitled"}
            </Button>
          ))}
        </div>
      )}
    </>
  );
};

const FileListContextMenu = memo(
  ({
    note,
    asChild,
    children,
  }: {
    note: NoteType;
    children: React.ReactNode;
    asChild?: boolean;
  }) => {
    const {
      syncedIds,
      deleteNote,
      renameNote,
      pinNote,
      unPinNote,
      transitionNoteToCloud,
      transitionNoteToLocal,
      transitionNoteToPublic,
      transitionNoteToPrivate,
    } = useNote();

    const [activeMenu, setActiveMenu] = useState<"rename" | "move" | "context">(
      "context",
    );

    const isPublic = note.is_public === 1;
    const isPinned = note.is_pinned === 1;
    const isSynced = note.is_synced === 1;

    const handleCloseContextMenu = () => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    };

    return (
      <React.Fragment>
        <ContextMenu
          onOpenChange={(oc) => {
            // Prevents flash of context menu when closing
            setTimeout(() => {
              if (oc == false) {
                setActiveMenu("context");
              }
            }, 100);
          }}
        >
          <ContextMenuTrigger asChild={asChild}>{children}</ContextMenuTrigger>
          <ContextMenuContent>
            {activeMenu === "context" && (
              <>
                <ContextMenuGroup>
                  {!isPinned && (
                    <ContextMenuItem
                      onClick={() => {
                        pinNote(note.id);
                      }}
                    >
                      <Pin />
                      Pin to favourites
                    </ContextMenuItem>
                  )}
                  {isPinned && (
                    <ContextMenuItem
                      onClick={() => {
                        unPinNote(note.id);
                      }}
                    >
                      <PinOff />
                      Unpin from favourites
                    </ContextMenuItem>
                  )}
                </ContextMenuGroup>
                <ContextMenuSeparator />
                <ContextMenuGroup>
                  <ContextMenuItem
                    onClick={(e) => {
                      e.preventDefault();
                      setActiveMenu("rename");
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
                  <ContextMenuItem
                    onClick={(e) => {
                      e.preventDefault();
                      setActiveMenu("move");
                    }}
                  >
                    <FileSymlink />
                    Move to
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => deleteNote(note.id)}>
                    <Trash />
                    Trash note
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
                      <CloudOff />
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
            )}
            {activeMenu === "rename" && (
              <Input
                defaultValue={note.name}
                autoFocus
                className="focus-visible:ring-0 w-80"
                onChange={(e) => {
                  renameNote(note.id, e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCloseContextMenu();
                  }
                }}
              />
            )}
            {activeMenu === "move" && (
              <FileMoveTo
                activeNote={note}
                handleCloseContextMenu={handleCloseContextMenu}
              />
            )}
          </ContextMenuContent>
        </ContextMenu>
      </React.Fragment>
    );
  },
);

export default FileListContextMenu;
