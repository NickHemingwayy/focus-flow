"use client";
import { useNote } from "@/hooks/use-note";
import { NoteType } from "@/lib/powersync/app-schema";
import { usePowerSync, useQuery } from "@powersync/react";
import dayjs from "dayjs";
import {
  Cloud,
  CloudOff,
  Copy,
  FileSymlink,
  FileText,
  Globe,
  GlobeX,
  MoveUpRight,
  Pin,
  PinOff,
  Plus,
  SquarePen,
  Trash,
} from "lucide-react";
import Link from "next/link";
import React, { memo, useState } from "react";
import { Button } from "./ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "./ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Input } from "./ui/input";

type MenuType = "context" | "dropdown";

function getMenuPrimitives(menuType: MenuType) {
  if (menuType === "dropdown") {
    return {
      Menu: DropdownMenu,
      MenuTrigger: DropdownMenuTrigger,
      MenuContent: DropdownMenuContent,
      MenuGroup: DropdownMenuGroup,
      MenuItem: DropdownMenuItem,
      MenuSeparator: DropdownMenuSeparator,
    };
  }
  return {
    Menu: ContextMenu,
    MenuTrigger: ContextMenuTrigger,
    MenuContent: ContextMenuContent,
    MenuGroup: ContextMenuGroup,
    MenuItem: ContextMenuItem,
    MenuSeparator: ContextMenuSeparator,
  };
}

const FileMoveTo = ({
  activeNote,
  handleCloseMenu,
}: {
  activeNote: NoteType;
  handleCloseMenu: () => void;
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
              variant="ghost"
              className="justify-start text-muted-foreground"
              disabled={note.id === activeNote.parent_id}
              onClick={() => {
                moveNote(activeNote.id, note.id, activeNote.is_synced);
                handleCloseMenu();
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

type ActiveMenu = "context" | "rename" | "move";

const FileMenu = memo(
  ({
    note,
    asChild,
    children,
    menuType = "dropdown",
  }: {
    note: NoteType;
    children: React.ReactNode;
    asChild?: boolean;
    menuType?: MenuType;
  }) => {
    const {
      deleteNote,
      renameNote,
      createNote,
      pinNote,
      unPinNote,
      transitionNoteToCloud,
      transitionNoteToLocal,
      transitionNoteToPublic,
      transitionNoteToPrivate,

      getTableName,
    } = useNote();

    const powersync = usePowerSync();

    const [activeMenu, setActiveMenu] = useState<ActiveMenu>("context");

    const {
      Menu,
      MenuTrigger,
      MenuContent,
      MenuGroup,
      MenuItem,
      MenuSeparator,
    } = getMenuPrimitives(menuType);

    const isPublic = note.is_public === 1;
    const isPinned = note.is_pinned === 1;
    const isSynced = note.is_synced === 1;

    const handleCloseMenu = () => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    };

    const handleDuplicateNote = async () => {
      const table = getTableName(note.is_synced);
      const contentRes = (await powersync.get(
        `SELECT content from ${table} WHERE id = ?`,
        [note.id],
      )) as { content: string };
      createNote({
        name: note.name + " Copy",
        parent_id: note.parent_id,
        is_synced: note.is_synced,
        is_public: note.is_public,
        is_pinned: note.is_pinned,
        content: contentRes?.content || "",
      });
    };
    const handleCreateChildNote = () => {
      createNote({
        parent_id: note.id,
      });
    };

    return (
      <React.Fragment>
        <Menu
          onOpenChange={(isOpen) => {
            // Prevents flash of stale sub-menu state when re-opening
            setTimeout(() => {
              if (!isOpen) {
                setActiveMenu("context");
              }
            }, 100);
          }}
        >
          <MenuTrigger asChild={asChild}>{children}</MenuTrigger>

          <MenuContent>
            {/* ── Main context menu ─────────────────────────────────────── */}
            {activeMenu === "context" && (
              <>
                <MenuGroup>
                  {isPinned ? (
                    <MenuItem
                      onClick={() => unPinNote(note.id, note.is_synced)}
                    >
                      <PinOff />
                      Unpin from favourites
                    </MenuItem>
                  ) : (
                    <MenuItem onClick={() => pinNote(note.id, note.is_synced)}>
                      <Pin />
                      Pin to favourites
                    </MenuItem>
                  )}
                </MenuGroup>

                <MenuSeparator />

                <MenuGroup>
                  <MenuItem
                    onClick={(e) => {
                      e.preventDefault();
                      setActiveMenu("rename");
                    }}
                  >
                    <SquarePen />
                    Rename
                  </MenuItem>
                  <MenuItem onClick={handleDuplicateNote}>
                    <Copy />
                    Duplicate
                  </MenuItem>

                  <MenuItem asChild>
                    <Link href={`/${note.id}`} target="_blank">
                      <MoveUpRight />
                      Open in new tab
                    </Link>
                  </MenuItem>
                  <MenuItem
                    onClick={(e) => {
                      e.preventDefault();
                      setActiveMenu("move");
                    }}
                  >
                    <FileSymlink />
                    Move to
                  </MenuItem>

                  <MenuItem onClick={handleCreateChildNote}>
                    <Plus />
                    Create child note
                  </MenuItem>

                  <MenuItem onClick={() => deleteNote(note.id, note.is_synced)}>
                    <Trash />
                    Trash note
                  </MenuItem>
                </MenuGroup>

                <MenuSeparator />

                <MenuGroup>
                  {isSynced ? (
                    <MenuItem onClick={() => transitionNoteToLocal(note.id)}>
                      <CloudOff />
                      Remove from sync store
                    </MenuItem>
                  ) : (
                    <MenuItem onClick={() => transitionNoteToCloud(note.id)}>
                      <Cloud />
                      Add to sync store
                    </MenuItem>
                  )}

                  {isPublic ? (
                    <MenuItem onClick={() => transitionNoteToPrivate(note.id)}>
                      <GlobeX />
                      Unpublish
                    </MenuItem>
                  ) : (
                    <MenuItem
                      onClick={() =>
                        transitionNoteToPublic(note.id, note.is_synced)
                      }
                    >
                      <Globe />
                      Make public
                    </MenuItem>
                  )}
                </MenuGroup>

                <MenuSeparator />

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
                onChange={(e) =>
                  renameNote(note.id, e.target.value, note.is_synced)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCloseMenu();
                }}
              />
            )}

            {activeMenu === "move" && (
              <FileMoveTo activeNote={note} handleCloseMenu={handleCloseMenu} />
            )}
          </MenuContent>
        </Menu>
      </React.Fragment>
    );
  },
);

FileMenu.displayName = "FileMenu";

export default FileMenu;
