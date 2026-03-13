"use client";

import { FC, useRef, useState, useMemo } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { SlashItem, SLASH_ITEMS } from "./items";
import { createSlashCommandExtension } from "./extension";

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Owns all slash menu state and returns:
 *   - `slashExtension`  — the TipTap extension to register in useEditor
 *   - `slashMenuProps`  — props to spread onto <SlashMenu />
 *
 * The extension is created once via useMemo with stable callback refs,
 * so TipTap never re-registers the ProseMirror plugin on re-render.
 */
export function useSlashMenu() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<SlashItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Holds the editor instance so the Enter key handler always has it.
  // Set by calling setEditor(editor) after useEditor() resolves in NotePad.
  const editorRef = useRef<any>(null);

  // Refs for values the extension closure reads — avoids stale captures
  const itemsRef = useRef<SlashItem[]>(SLASH_ITEMS);
  const selectedIndexRef = useRef(0);
  const rangeRef = useRef<{ from: number; to: number } | null>(null);
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const mouseMovedRef = useRef(false);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Keep selectedIndexRef in sync so the extension's onKeyDown always
  // reads the current value without a stale closure
  const setSelectedIndexSynced = (
    indexOrUpdater: number | ((i: number) => number),
  ) => {
    setSelectedIndex((prev) => {
      const next =
        typeof indexOrUpdater === "function"
          ? indexOrUpdater(prev)
          : indexOrUpdater;
      selectedIndexRef.current = next;
      return next;
    });
  };

  const positionAnchor = (view: any) => {
    if (!anchorRef.current) return;
    const { from } = view.state.selection;
    const coords = view.coordsAtPos(from);
    const rect = (view.dom as HTMLElement).getBoundingClientRect();
    anchorRef.current.style.left = `${coords.left - rect.left}px`;
    anchorRef.current.style.top = `${coords.bottom - rect.top}px`;
  };

  const openMenu = (nextItems: SlashItem[], view: any, range: any) => {
    mouseMovedRef.current = false;
    itemRefs.current = new Array(nextItems.length).fill(null);
    rangeRef.current = range;
    itemsRef.current = nextItems;
    positionAnchor(view);
    setItems(nextItems);
    setSelectedIndexSynced(0);
    setOpen(true);
  };

  const closeMenu = () => {
    setOpen(false);
    setItems([]);
    itemsRef.current = SLASH_ITEMS;
    rangeRef.current = null;
  };

  const scrollItemIntoView = (index: number) => {
    itemRefs.current[index]?.scrollIntoView({ block: "nearest" });
  };

  // Stable callback refs passed into the extension — the extension always
  // calls through these refs so it never holds stale closures
  const callbackRefs = useRef({
    onStart: (nextItems: SlashItem[], view: any, range: any) =>
      openMenu(nextItems, view, range),
    onUpdate: (nextItems: SlashItem[], view: any, range: any) => {
      itemRefs.current = new Array(nextItems.length).fill(null);
      rangeRef.current = range;
      itemsRef.current = nextItems;
      positionAnchor(view);
      setItems(nextItems);
      setSelectedIndexSynced(0);
    },
    onExit: () => closeMenu(),
    onKeyDown: (event: KeyboardEvent): boolean => {
      if (event.key === "Escape") {
        closeMenu();
        return true;
      }
      if (event.key === "ArrowDown") {
        setSelectedIndexSynced((i) => {
          const next = i < itemsRef.current.length - 1 ? i + 1 : 0;
          scrollItemIntoView(next);
          return next;
        });
        return true;
      }
      if (event.key === "ArrowUp") {
        setSelectedIndexSynced((i) => {
          const next = i > 0 ? i - 1 : itemsRef.current.length - 1;
          scrollItemIntoView(next);
          return next;
        });
        return true;
      }
      if (event.key === "Enter") {
        const item = itemsRef.current[selectedIndexRef.current];
        const range = rangeRef.current;
        if (item && range && editorRef.current) {
          item.command({ editor: editorRef.current, range });
        }
        return true;
      }
      return false;
    },
  });

  // Created once — stable ref callbacks mean the closure is never stale
  const slashExtension = useMemo(
    () => createSlashCommandExtension(callbackRefs.current),
    [],
  );

  return {
    slashExtension,
    setEditor: (editor: any) => {
      editorRef.current = editor;
    },
    slashMenuProps: {
      open,
      items,
      selectedIndex,
      anchorRef,
      itemRefs,
      mouseMovedRef,
      rangeRef,
      onClose: closeMenu,
      onMouseMove: () => {
        mouseMovedRef.current = true;
      },
    },
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

type SlashMenuProps = {
  open: boolean;
  items: SlashItem[];
  selectedIndex: number;
  anchorRef: React.RefObject<HTMLDivElement | null>;
  itemRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  mouseMovedRef: React.MutableRefObject<boolean>;
  rangeRef: React.MutableRefObject<{ from: number; to: number } | null>;
  onClose: () => void;
  onMouseMove: () => void;
  editor: any;
};

export const SlashMenu: FC<SlashMenuProps> = ({
  open,
  items,
  selectedIndex,
  anchorRef,
  itemRefs,
  mouseMovedRef,
  rangeRef,
  onClose,
  onMouseMove,
  editor,
}) => {
  return (
    <Popover open={open} onOpenChange={(o) => !o && onClose()}>
      <PopoverAnchor asChild>
        <div
          ref={anchorRef}
          className="absolute w-0 h-0 pointer-events-none"
          aria-hidden
        />
      </PopoverAnchor>

      <PopoverContent
        className="p-0 w-64"
        side="bottom"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <Command shouldFilter={false}>
          <CommandList className="max-h-72 overflow-y-auto">
            {items.length === 0 && <CommandEmpty>No results</CommandEmpty>}
            <CommandGroup>
              {items.map((item, index) => (
                <CommandItem
                  key={item.title}
                  ref={(el) => {
                    itemRefs.current[index] = el;
                  }}
                  onMouseMove={onMouseMove}
                  className={
                    !mouseMovedRef.current && index === selectedIndex
                      ? "bg-accent"
                      : ""
                  }
                  onMouseDown={(e) => e.preventDefault()}
                  onSelect={() => {
                    const range = rangeRef.current;
                    if (!range || !editor) return;
                    item.command({ editor, range });
                  }}
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{item.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {item.description}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
