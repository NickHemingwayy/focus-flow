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
  MoveUpRight,
  SquarePen,
  Trash,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import React, { useState } from "react";
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

const UsersFileList = () => {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;

  const { data: notes } = useQuery("SELECT * FROM notes");

  const localNotes = notes?.filter((note) => note.is_synced === 0);
  const syncedNotes = notes?.filter((note) => note.is_synced === 1);

  return (
    <div className="flex flex-col gap-2">
      <span className="text-muted-foreground ps-3 text-xs block mt-4">
        Local files
      </span>
      {localNotes?.map((note) => (
        <FileListItem note={note} slug={slug} key={note.id} />
      ))}
      <span className="text-muted-foreground ps-3 text-xs block mt-4">
        Synced files
      </span>
      {syncedNotes?.map((note) => (
        <FileListItem note={note} slug={slug} key={note.id} />
      ))}
      <span className="text-muted-foreground ps-3 text-xs block mt-4">
        Public files
      </span>
    </div>
  );
};

const FileListItem = ({ note, slug }: { note: NoteRecord; slug: string }) => {
  const {
    deleteNote,
    renameNote,
    transitionNoteToCloud,
    transitionNoteToLocal,
  } = useNote();

  const [editingNoteName, setEditingNoteName] = useState(false);

  const isPublic = note.is_public;
  const isSynced = note.is_synced;

  return (
    <React.Fragment key={note.id}>
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
            key={note.id}
            variant={slug === note.id ? "secondary" : "ghost"}
            className={cn(
              "justify-start max-w-full",
              slug !== note.id && "text-muted-foreground",
            )}
            asChild
          >
            <Link href={`/${note.id}`}>
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
                {!isSynced && !isPublic && (
                  <ContextMenuItem
                    onClick={() => transitionNoteToCloud(note.id)}
                  >
                    <Cloud />
                    Add to sync store
                  </ContextMenuItem>
                )}

                {!isPublic && (
                  <ContextMenuItem>
                    <Globe />
                    Make public
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
              </ContextMenuGroup>
              <ContextMenuSeparator />
              <span className="text-xs text-muted-foreground px-2 pb-1 block">
                Last edited{" "}
                {dayjs(note.updated_at).format("MMM D, YYYY, h:mm A")}
              </span>
            </>
          ) : (
            <Input
              value={note.name}
              autoFocus
              onChange={(e) => {
                renameNote(note.id, e.target.value);
              }}
            />
          )}
        </ContextMenuContent>
      </ContextMenu>
    </React.Fragment>
  );
};

export default UsersFileList;
