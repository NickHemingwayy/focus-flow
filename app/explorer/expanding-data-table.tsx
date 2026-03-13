"use client";

import React, { useState } from "react"; // Added useState
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel, // Added this
  useReactTable,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronDown, ChevronRight } from "lucide-react"; // Icons for the tree
import FileMenu from "@/components/file-menu";

// Update interface to support generic nested data
interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  onRowClick?: (rowData: TData) => void;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  onRowClick,
}: DataTableProps<TData, TValue>) {
  // 1. State for expansion
  const [expanded, setExpanded] = useState<any>(true); // 'true' expands all by default

  const table = useReactTable({
    data,
    columns,
    state: {
      expanded,
    },
    onExpandedChange: setExpanded,
    getSubRows: (row: any) => row.children, // 2. Tell the table where children live
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(), // 3. Required for expanding logic
  });

  return (
    <div className="overflow-hidden rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} className="text-muted-foreground">
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <FileMenu
                menuType="context"
                note={row.original}
                key={`table-row-item-${row.original.id}`}
                asChild
              >
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  onClick={(e) => {
                    if (e.button !== 0) return; // Only allow left-click to prevent conflicts with context menu
                    e.stopPropagation();
                    onRowClick?.(row.original);
                  }}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell, index) => (
                    <TableCell
                      key={cell.id}
                      // 4. Visual Indentation: Apply only to the first column
                      style={{
                        paddingLeft:
                          index === 0 ? `${row.depth * 1}rem` : undefined,
                      }}
                    >
                      <div className="flex items-center gap-2">
                        {/* 5. Add Expand/Collapse Button to the first cell */}
                        {index === 0 && row.getCanExpand() && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // Don't trigger row click
                              row.getToggleExpandedHandler()();
                            }}
                            className="hover:bg-accent rounded p-1 ms-1"
                          >
                            {row.getIsExpanded() ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                        )}
                        {/* Spacer for rows that can't expand so text aligns */}
                        {index === 0 && !row.getCanExpand() && (
                          <div className="w-6 ms-1" />
                        )}

                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </div>
                    </TableCell>
                  ))}
                </TableRow>
              </FileMenu>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
