"use client";
import { useParams } from "next/navigation";
import { SidebarTrigger } from "./ui/sidebar";
import { useQuery } from "@powersync/react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Fragment } from "react/jsx-runtime";
import Link from "next/link";
import { NoteType } from "@/lib/powersync/app-schema";
import { Button } from "./ui/button";
import { Clock, Ellipsis, Plus } from "lucide-react";
import FileMenu from "./file-menu";
import { formatRelativeTime } from "@/lib/utils";

interface Breadcrumb {
  id: string;
  name: string;
}
const Header = () => {
  const params = useParams<{ slug: string }>();

  const slug = params?.slug as string;

  const { data: breadcrumbs } = useQuery<Breadcrumb>(
    `
    WITH RECURSIVE
      all_notes AS (
        SELECT id, name, parent_id FROM localNotes
        UNION ALL
        SELECT id, name, parent_id FROM syncedNotes
      ),
      ancestors(id, name, parent_id, level) AS (
        SELECT id, name, parent_id, 0 FROM all_notes WHERE id = ?
        UNION ALL
        SELECT t.id, t.name, t.parent_id, a.level + 1
        FROM all_notes t JOIN ancestors a ON t.id = a.parent_id
      )
    SELECT id, name FROM ancestors ORDER BY level DESC;
  `,
    [slug],
  );

  const { data: notes, isLoading } = useQuery<NoteType>(
    `SELECT * FROM (SELECT id, name, created_at, updated_at, is_pinned, is_public, parent_id, 0 as is_synced FROM localNotes UNION ALL SELECT id, name, created_at, updated_at, is_pinned, is_public, parent_id, 1 as is_synced FROM syncedNotes) WHERE id = ?`,
    [slug],
  );
  const note = notes?.length > 0 ? notes[0] : null;

  return (
    <div className="w-full p-2 bg-background absolute top-0 left-0 right-0 z-10 flex items-center justify-between gap-8">
      <div className="flex gap-4 items-center">
        <SidebarTrigger className="cursor-pointer" />
        {breadcrumbs?.length > 0 && (
          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumbs?.map((breadcrumb, index) => (
                <Fragment key={breadcrumb.id}>
                  <BreadcrumbItem>
                    {breadcrumb.id === slug ? (
                      <BreadcrumbPage>
                        {breadcrumb.name || "Untitled"}
                      </BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <Link href={`/${breadcrumb.id}`}>
                          {breadcrumb.name || "Untitled"}
                        </Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>

                  {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
                </Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        )}
      </div>
      {note && (
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground items-center text-xs flex gap-2">
            <Clock size={10} strokeWidth={2} />
            {formatRelativeTime(note.updated_at)}
          </span>
          {/* <Button
            variant={"ghost"}
            className="cursor-pointer text-muted-foreground"
          >
            <Plus />
            New Note
          </Button> */}
          <FileMenu note={note} asChild>
            <Button
              variant={"ghost"}
              className={"text-muted-foreground"}
              size={"icon"}
            >
              <Ellipsis />
            </Button>
          </FileMenu>
        </div>
      )}
    </div>
  );
};
export default Header;
