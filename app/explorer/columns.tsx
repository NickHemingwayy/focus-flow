"use client";

import { NoteType } from "@/lib/powersync/app-schema";
import { ColumnDef } from "@tanstack/react-table";
import dayjs from "dayjs";
import { Check } from "lucide-react";
import { NoteTypeWithChildren } from "./page";
import { formatRelativeTime } from "@/lib/utils";

// This type is used to define the shape of our data.
// You can use a Zod schema here if you want.

export const columns: ColumnDef<NoteTypeWithChildren>[] = [
  {
    accessorKey: "name",
    header: "Note name",
    cell: ({ getValue }) => {
      return (
        getValue() || <span className="text-muted-foreground">Untitled</span>
      );
    },
  },
  {
    accessorKey: "is_synced",
    header: "Synced",
    cell: ({ getValue }) => {
      const isSynced = getValue() as number;
      return isSynced ? <Check size={16} /> : "";
    },
  },
  {
    accessorKey: "is_public",
    header: "Public",
    cell: ({ getValue }) => {
      const isSynced = getValue() as number;
      return isSynced ? <Check size={16} /> : "";
    },
  },
  {
    accessorKey: "is_pinned",
    header: "Pinned",
    cell: ({ getValue }) => {
      const isSynced = getValue() as number;
      return isSynced ? <Check size={16} /> : "";
    },
  },
  {
    accessorKey: "updated_at",
    header: "Last edited",
    cell: ({ getValue }) => {
      return formatRelativeTime(getValue() as string);
    },
  },
  {
    accessorKey: "created_at",
    header: "Created",
    cell: ({ getValue }) => {
      return formatRelativeTime(getValue() as string);
    },
  },
];
