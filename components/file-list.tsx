"use client";
import { useNote } from "@/hooks/use-note";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";
import dayjs from "dayjs";
import { useLiveQuery } from "dexie-react-hooks";
import { FileText, MoveUpRight, SquarePen, Trash } from "lucide-react";
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
  const slug = parseInt(params?.slug);

  const { deleteNote, renameNote, notes } = useNote();

  const [editingNoteName, setEditingNoteName] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      {notes?.map((note) => (
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
                  <span className="truncate inline-block">{note.name}</span>
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
                  <span className="text-xs text-muted-foreground px-2 pb-1 block">
                    Last edited{" "}
                    {dayjs(note.updatedAt).format("MMM D, YYYY, h:mm A")}
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
      ))}
    </div>
  );
};

export default UsersFileList;
