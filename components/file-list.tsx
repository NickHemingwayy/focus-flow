"use client";
import { NoteType } from "@/lib/powersync/app-schema";
import { cn } from "@/lib/utils";
import { useQuery } from "@powersync/react";
import { CloudCheck, Globe, HardDrive } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import FileMenu from "./file-menu";

const UsersFileList = () => {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;

  const [activeId, setActiveId] = useState<string | null>(slug);

  useEffect(() => {
    setActiveId(slug);
  }, [slug]);

  const { data: recentNotes } = useQuery<NoteType>(
    `SELECT * FROM (SELECT id, name, created_at, updated_at, is_pinned, is_public, parent_id, 0 as is_synced FROM localNotes UNION ALL SELECT id, name, created_at, updated_at, is_pinned, is_public, parent_id, 1 as is_synced FROM syncedNotes) ORDER BY updated_at DESC LIMIT 10`,
  );

  const { data: pinnedNotes } = useQuery<NoteType>(
    `SELECT * FROM (
        SELECT id, name, created_at, updated_at, is_pinned, is_public, parent_id, 0 as is_synced FROM localNotes
        UNION ALL
        SELECT id, name, created_at, updated_at, is_pinned, is_public, parent_id, 1 as is_synced FROM syncedNotes
      ) WHERE is_pinned = 1 ORDER BY updated_at DESC`,
  );

  return (
    <div className="flex flex-col">
      <span className="text-muted-foreground ps-3 text-xs block mt-4 flex font-bold">
        Pinned files
      </span>

      {pinnedNotes?.map((note) => (
        <FileMenu
          menuType="context"
          note={note}
          key={`pinned-${note.id}`}
          asChild
        >
          <Button
            variant={activeId === note.id ? "secondary" : "ghost"}
            className={cn(
              "justify-start max-w-full",
              activeId !== note.id && "text-muted-foreground",
            )}
            asChild
          >
            <Link href={`/${note.id}`} onClick={() => setActiveId(note.id)}>
              <NoteIcon note={note} />
              <span className="truncate inline-block font-light">
                {note.name || "Untitled"}
              </span>
            </Link>
          </Button>
        </FileMenu>
      ))}
      <span className="text-muted-foreground ps-3 text-xs block mt-4 font-bold">
        Recents
      </span>
      {recentNotes?.map((note) => (
        <FileMenu
          menuType="context"
          note={note}
          key={`local-${note.id}`}
          asChild
        >
          <Button
            variant={activeId === note.id ? "secondary" : "ghost"}
            className={cn(
              "justify-start max-w-full",
              activeId !== note.id && "text-muted-foreground",
            )}
            asChild
          >
            <Link href={`/${note.id}`} onClick={() => setActiveId(note.id)}>
              <NoteIcon note={note} />
              <span className="truncate inline-block font-light">
                {note.name || "Untitled"}
              </span>
            </Link>
          </Button>
        </FileMenu>
      ))}
    </div>
  );
};

const NoteIcon = ({ note }: { note: NoteType }) => {
  let icon = <HardDrive />;
  const isPublic = note.is_public;
  const isSynced = note.is_synced;

  if (isPublic) {
    icon = <Globe className="text-emerald-500 dark:text-emerald-300" />;
  } else if (isSynced) {
    icon = <CloudCheck className="text-sky-500 dark:text-sky-300 " />;
  }
  return icon;
};

export default UsersFileList;
