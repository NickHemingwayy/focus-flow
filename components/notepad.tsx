"use client";

import { FC, useEffect, useRef, useState } from "react";
import {
  useEditor,
  EditorContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
} from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Node, mergeAttributes, Extension } from "@tiptap/core";
import { Suggestion } from "@tiptap/suggestion";
import * as Y from "yjs";
import { usePowerSync } from "@powersync/react";
import { NoteType } from "@/lib/powersync/app-schema";
import debounce from "lodash.debounce";
import { useNote } from "@/hooks/use-note";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function encodeState(doc: Y.Doc): string {
  const stateVector = Y.encodeStateAsUpdate(doc);
  return btoa(
    String.fromCharCode.apply(null, stateVector as unknown as number[]),
  );
}

function applyPersistedState(doc: Y.Doc, content: string | Uint8Array): void {
  const binary =
    typeof content === "string"
      ? Uint8Array.from(atob(content), (c) => c.charCodeAt(0))
      : content;
  Y.applyUpdate(doc, binary);
}

function getStoredJSON(doc: Y.Doc): Record<string, unknown> | null {
  const contentMap = doc.getMap<unknown>("content");
  return (contentMap.get("json") as Record<string, unknown>) ?? null;
}

// ─── Resizable URL-only Image node view ──────────────────────────────────────

const MIN_IMG_WIDTH = 80;

const ImageUrlNodeView: FC<{
  node: any;
  updateAttributes: (attrs: any) => void;
  selected: boolean;
}> = ({ node, updateAttributes, selected }) => {
  const [draft, setDraft] = useState(node.attrs.src ?? "");
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const currentWidth: number = node.attrs.width ?? 500;

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed) updateAttributes({ src: trimmed });
  };

  const onResizeStart = (e: React.MouseEvent, side: "left" | "right") => {
    e.preventDefault();
    e.stopPropagation();
    startXRef.current = e.clientX;
    startWidthRef.current = currentWidth;
    setIsResizing(true);

    const onMouseMove = (ev: MouseEvent) => {
      const delta =
        side === "right"
          ? ev.clientX - startXRef.current
          : startXRef.current - ev.clientX;
      const parentWidth =
        containerRef.current?.parentElement?.clientWidth ?? 800;
      const next = Math.min(
        Math.max(startWidthRef.current + delta, MIN_IMG_WIDTH),
        parentWidth,
      );
      updateAttributes({ width: Math.round(next) });
    };

    const onMouseUp = () => {
      setIsResizing(false);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  return (
    <NodeViewWrapper
      className="flex justify-center my-3"
      style={{ userSelect: isResizing ? "none" : "auto" }}
    >
      {node.attrs.src ? (
        <div
          ref={containerRef}
          className={`relative inline-block rounded-md ${
            selected ? "ring-2 ring-ring ring-offset-2" : ""
          }`}
          style={{ width: currentWidth }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={node.attrs.src}
            alt={node.attrs.alt ?? ""}
            className="block w-full h-auto rounded-md"
            draggable={false}
            onError={() => updateAttributes({ src: null })}
          />
          {selected && (
            <>
              {(["left", "right"] as const).map((side) => (
                <div
                  key={side}
                  onMouseDown={(e) => onResizeStart(e, side)}
                  style={{ [side]: 0 }}
                  className={`absolute top-1/2 -translate-y-1/2 ${
                    side === "left" ? "-translate-x-1/2" : "translate-x-1/2"
                  } w-3 h-8 rounded-full bg-background border border-border shadow cursor-ew-resize z-10 flex items-center justify-center`}
                >
                  <div className="w-0.5 h-4 bg-muted-foreground rounded-full" />
                </div>
              ))}
            </>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 p-3 bg-muted/40 rounded-md border border-border w-full max-w-md">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commit();
              }
            }}
            placeholder="Paste an image URL…"
            className="flex-1 h-8 text-sm"
          />
          <Button
            size="sm"
            variant="secondary"
            onMouseDown={(e) => {
              e.preventDefault();
              commit();
            }}
          >
            Insert
          </Button>
        </div>
      )}
    </NodeViewWrapper>
  );
};

const ImageUrlExtension = Node.create({
  name: "imageUrl",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      width: { default: 500 },
    };
  },

  parseHTML() {
    return [{ tag: "img[data-type='imageUrl']" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "img",
      mergeAttributes(HTMLAttributes, { "data-type": "imageUrl" }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageUrlNodeView);
  },
});

// ─── Slash-command items ──────────────────────────────────────────────────────

type SlashItem = {
  title: string;
  description: string;
  command: (params: { editor: any; range: any }) => void;
};

const SLASH_ITEMS: SlashItem[] = [
  {
    title: "Text",
    description: "Plain paragraph",
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setParagraph().run(),
  },
  {
    title: "Heading 1",
    description: "Large section heading",
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run(),
  },
  {
    title: "Heading 2",
    description: "Medium section heading",
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run(),
  },
  {
    title: "Heading 3",
    description: "Small section heading",
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run(),
  },
  {
    title: "Bullet List",
    description: "Unordered list",
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    title: "Numbered List",
    description: "Ordered list",
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
  {
    title: "Task List",
    description: "Checklist / to-do items",
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleTaskList().run(),
  },
  {
    title: "Image",
    description: "Embed image from URL",
    command: ({ editor, range }) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({ type: "imageUrl" })
        .run(),
  },
  {
    title: "Blockquote",
    description: "Quoted text block",
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setBlockquote().run(),
  },
  {
    title: "Code Block",
    description: "Monospaced code",
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setCodeBlock().run(),
  },
  {
    title: "Divider",
    description: "Horizontal rule",
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
  },
];

function filterItems(query: string): SlashItem[] {
  if (!query) return SLASH_ITEMS;
  return SLASH_ITEMS.filter(
    (item) =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.description.toLowerCase().includes(query.toLowerCase()),
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

const NotePad: FC<{ note: NoteType }> = ({ note }) => {
  const [isReady, setIsReady] = useState(false);
  const [initialContent, setInitialContent] = useState<Record<
    string,
    unknown
  > | null>(null);

  const slashItemsRef = useRef<SlashItem[]>(SLASH_ITEMS);
  const slashQueryRef = useRef("");
  const slashRangeRef = useRef<{ from: number; to: number } | null>(null);
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashItems, setSlashItems] = useState<SlashItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedIndexRef = useRef(0);
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const mouseMovedRef = useRef(false);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  const ydocRef = useRef<Y.Doc | null>(null);
  const isInitializedRef = useRef(false);
  const editorRef = useRef<any>(null);
  const powerSync = usePowerSync();
  const { updateNoteContent } = useNote();

  const debouncedSave = useRef(
    debounce((doc: Y.Doc, noteId: string, isSynced: number) => {
      updateNoteContent(noteId, encodeState(doc), isSynced);
    }, 300),
  ).current;

  useEffect(() => {
    selectedIndexRef.current = selectedIndex;
  }, [selectedIndex]);

  // ── Bootstrap Yjs ────────────────────────────────────────────────────────
  useEffect(() => {
    if (isInitializedRef.current || !note) return;

    const doc = new Y.Doc();
    ydocRef.current = doc;

    if (note.content) {
      try {
        applyPersistedState(doc, note.content);
      } catch (e) {
        console.error("Failed to parse Yjs document state from PowerSync", e);
      }
    }

    doc.on("update", () => {
      debouncedSave(doc, note.id, note.is_synced as number);
    });

    setInitialContent(getStoredJSON(doc));
    isInitializedRef.current = true;
    setIsReady(true);

    return () => {
      debouncedSave.cancel();
      doc.destroy();
      ydocRef.current = null;
      isInitializedRef.current = false;
      setIsReady(false);
      setInitialContent(null);
    };
  }, [powerSync]);

  // ── Anchor positioning ───────────────────────────────────────────────────
  const positionAnchor = (view: any) => {
    if (!anchorRef.current) return;
    const { from } = view.state.selection;
    const coords = view.coordsAtPos(from);
    const rect = (view.dom as HTMLElement).getBoundingClientRect();
    anchorRef.current.style.left = `${coords.left - rect.left}px`;
    anchorRef.current.style.top = `${coords.bottom - rect.top}px`;
  };

  const openSlash = (items: SlashItem[], view?: any) => {
    mouseMovedRef.current = false;
    itemRefs.current = new Array(items.length).fill(null);
    if (view) positionAnchor(view);
    setSlashItems(items);
    setSelectedIndex(0);
    setSlashOpen(true);
  };

  const closeSlash = () => {
    setSlashOpen(false);
    setSlashItems([]);
    slashItemsRef.current = SLASH_ITEMS;
    slashQueryRef.current = "";
    slashRangeRef.current = null;
  };

  const scrollItemIntoView = (index: number) => {
    itemRefs.current[index]?.scrollIntoView({ block: "nearest" });
  };

  // ── Slash-command extension ──────────────────────────────────────────────
  const SlashCommandExtension = Extension.create({
    name: "slashCommand",
    addOptions() {
      return {
        suggestion: {
          char: "/",
          startOfLine: false,
          allowSpaces: false,
          command: ({
            editor,
            range,
            props,
          }: {
            editor: any;
            range: any;
            props: SlashItem;
          }) => {
            props.command({ editor, range });
          },
          items: ({ query }: { query: string }) => {
            const results = filterItems(query);
            slashItemsRef.current = results;
            slashQueryRef.current = query;
            return results;
          },
          render: () => ({
            onStart: ({ query, range, editor }: any) => {
              slashRangeRef.current = range;
              const results = filterItems(query);
              slashItemsRef.current = results;
              slashQueryRef.current = query;
              openSlash(results, editor.view);
            },
            onUpdate: ({ query, range, editor }: any) => {
              slashRangeRef.current = range;
              const results = filterItems(query);
              slashItemsRef.current = results;
              slashQueryRef.current = query;
              itemRefs.current = new Array(results.length).fill(null);
              setSlashItems(results);
              setSelectedIndex(0);
              positionAnchor(editor.view);
            },
            onExit: () => closeSlash(),
            onKeyDown: ({ event }: { event: KeyboardEvent }) => {
              if (event.key === "Escape") {
                closeSlash();
                return true;
              }
              if (event.key === "ArrowDown") {
                setSelectedIndex((i) => {
                  const next = i < slashItemsRef.current.length - 1 ? i + 1 : 0;
                  scrollItemIntoView(next);
                  return next;
                });
                return true;
              }
              if (event.key === "ArrowUp") {
                setSelectedIndex((i) => {
                  const next = i > 0 ? i - 1 : slashItemsRef.current.length - 1;
                  scrollItemIntoView(next);
                  return next;
                });
                return true;
              }
              if (event.key === "Enter") {
                const item = slashItemsRef.current[selectedIndexRef.current];
                const range = slashRangeRef.current;
                if (item && range && editorRef.current) {
                  item.command({ editor: editorRef.current, range });
                }
                return true;
              }
              return false;
            },
          }),
        },
      };
    },
    addProseMirrorPlugins() {
      return [Suggestion({ editor: this.editor, ...this.options.suggestion })];
    },
  });

  // ── TipTap editor ────────────────────────────────────────────────────────
  const editor = useEditor(
    {
      extensions: [
        StarterKit,
        TaskList,
        TaskItem.configure({ nested: true }),
        ImageUrlExtension,
        Placeholder.configure({
          placeholder: "Start writing, or type '/' for commands…",
        }),
        SlashCommandExtension,
      ],
      content: initialContent ?? "",
      immediatelyRender: false,
      editorProps: {
        attributes: {
          class: "tiptap-editor focus:outline-none max-w-full min-h-[200px]",
        },
      },
      onUpdate: ({ editor }) => {
        const doc = ydocRef.current;
        if (!doc) return;
        doc.getMap<unknown>("content").set("json", editor.getJSON());
      },
      onCreate: ({ editor }) => {
        editorRef.current = editor;
      },
    },
    [isReady],
  );

  useEffect(() => {
    if (editor) editorRef.current = editor;
  }, [editor]);

  if (!isReady) return <div className="w-full opacity-0" />;

  return (
    <>
      <div
        className={`w-full relative transition-opacity duration-300 ${
          isReady ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* Bubble menu */}
        {editor && (
          <BubbleMenu
            editor={editor}
            shouldShow={({ state, editor }) => {
              // Hide on empty selections and when an image node is selected
              if (state.selection.from === state.selection.to) return false;
              if (editor.isActive("imageUrl")) return false;
              return true;
            }}
            className="flex items-center gap-1 rounded-md border border-border bg-background px-1 py-1 shadow-md"
          >
            {(
              [
                {
                  label: "B",
                  mark: "bold",
                  style: "font-bold",
                  action: "toggleBold",
                },
                {
                  label: "I",
                  mark: "italic",
                  style: "italic",
                  action: "toggleItalic",
                },
                {
                  label: "S",
                  mark: "strike",
                  style: "line-through",
                  action: "toggleStrike",
                },
                {
                  label: "<>",
                  mark: "code",
                  style: "font-mono",
                  action: "toggleCode",
                },
              ] as const
            ).map(({ label, mark, style, action }) => (
              <button
                key={mark}
                onClick={() => (editor.chain().focus() as any)[action]().run()}
                className={`rounded px-2 py-1 text-sm ${style} hover:bg-accent ${
                  editor.isActive(mark) ? "bg-accent" : ""
                }`}
              >
                {label}
              </button>
            ))}
          </BubbleMenu>
        )}

        {/* Slash-command popover */}
        <Popover
          open={slashOpen}
          onOpenChange={(open) => !open && closeSlash()}
        >
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
                {slashItems.length === 0 && (
                  <CommandEmpty>No results</CommandEmpty>
                )}
                <CommandGroup>
                  {slashItems.map((item, index) => (
                    <CommandItem
                      key={item.title}
                      ref={(el) => {
                        itemRefs.current[index] = el;
                      }}
                      onMouseMove={() => {
                        mouseMovedRef.current = true;
                      }}
                      className={
                        !mouseMovedRef.current && index === selectedIndex
                          ? "bg-accent"
                          : ""
                      }
                      onMouseDown={(e) => e.preventDefault()}
                      onSelect={() => {
                        const range = slashRangeRef.current;
                        if (!range || !editorRef.current) return;
                        item.command({ editor: editorRef.current, range });
                      }}
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {item.title}
                        </span>
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

        <EditorContent editor={editor} />
      </div>
    </>
  );
};

export default NotePad;
