"use client";

import { FC, useEffect, useMemo, useRef, useState } from "react";
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
import { Editor, Node, mergeAttributes } from "@tiptap/core";
import * as Y from "yjs";
import { usePowerSync } from "@powersync/react";
import { NoteType } from "@/lib/powersync/app-schema";
import debounce from "lodash.debounce";
import { useNote } from "@/hooks/use-note";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSlashMenu, SlashMenu } from "./slash-menu";
import { PowerSyncYjsProvider } from "@/lib/powersync/yjs/powersync_yjs_provider";
import Collaboration from "@tiptap/extension-collaboration";

// ─── Image URL extension ──────────────────────────────────────────────────────
// Renders a URL input when no src is set. Once committed, renders the image
// with left/right resize handles that update the width attribute directly.
// Using JSON storage means all attributes (src, alt, width) round-trip
// perfectly with no serialisation workarounds needed.

const MIN_IMG_WIDTH = 80;

const ImageUrlNodeView: FC<{
  node: any;
  updateAttributes: (attrs: any) => void;
  selected: boolean;
}> = ({ node, updateAttributes, selected }) => {
  const draftRef = useRef<string>("");
  const [draft, setDraftState] = useState("");
  const setDraft = (val: string) => {
    draftRef.current = val;
    setDraftState(val);
  };

  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  // null = full width (no inline style constraint); number = explicit px width
  const currentWidth: number | null = node.attrs.width ?? null;

  const commit = () => {
    const trimmed = draftRef.current.trim();
    if (!trimmed) return;
    updateAttributes({ src: trimmed });
  };

  const onResizeStart = (e: React.MouseEvent, side: "left" | "right") => {
    e.preventDefault();
    e.stopPropagation();
    startXRef.current = e.clientX;
    // If width is null (full width), read the actual rendered width as the start
    startWidthRef.current =
      currentWidth ?? containerRef.current?.offsetWidth ?? 500;
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
          className={`relative rounded-md ${
            currentWidth === null ? "w-full" : "inline-block"
          } ${selected ? "ring-2 ring-ring ring-offset-2" : ""}`}
          style={currentWidth !== null ? { width: currentWidth } : undefined}
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
      // null = full width; number = explicit px width set by resize handles
      width: { default: null },
    };
  },
  parseHTML() {
    return [
      // Our own serialised format (highest priority)
      { tag: "img[data-type='imageUrl']", priority: 52 },
      // Plain <img src> from pasted HTML (e.g. rendered markdown from GitHub)
      {
        tag: "img[src]",
        priority: 51,
        getAttrs: (el: Element) => {
          const img = el as HTMLImageElement;
          return {
            src: img.getAttribute("src"),
            alt: img.getAttribute("alt") ?? "",
            width: null, // always full-width on paste
          };
        },
      },
    ];
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseContent(raw: string | null | undefined): object | string {
  if (!raw) return "";
  try {
    return JSON.parse(raw);
  } catch {
    // Fallback: treat as plain text if somehow malformed
    return raw;
  }
}

export const baseExtensions = [
  StarterKit,
  TaskList,
  TaskItem.configure({ nested: true }),
  ImageUrlExtension,
  Placeholder.configure({
    placeholder: "Start writing, or type '/' for commands…",
  }),
];

// ─── Component ───────────────────────────────────────────────────────────────

const NotePad: FC<{ note: NoteType }> = ({ note }) => {
  console.log("note", note);
  const powerSync = usePowerSync();
  const { updateNoteContent } = useNote();

  const { slashExtension, setEditor, slashMenuProps } = useSlashMenu();

  const ydoc = useMemo(() => new Y.Doc(), [note?.id]);

  useEffect(() => {
    if (note.is_public !== 1) return;
    const provider = new PowerSyncYjsProvider(ydoc, powerSync, note.id);
    return () => provider.destroy();
  }, [ydoc, note.id]);

  const handleSaveContent = debounce((editor: Editor) => {
    // getJSON() is a lossless round-trip — all custom node attributes
    // (imageUrl src, alt, width etc.) are preserved exactly.
    const json = JSON.stringify(editor.getJSON());
    updateNoteContent(note.id, json, note.is_synced);
  }, 300);

  const tiptapExtensions = useMemo(() => {
    const base = [...baseExtensions, slashExtension];

    if (note.is_public !== 1) return base;
    return [...base, Collaboration.configure({ document: ydoc })];
  }, [note.is_public]);

  const editor = useEditor(
    {
      extensions: tiptapExtensions,
      // Parse stored JSON back into the editor. Falls back to empty string
      // for new notes that have no content_json yet.
      content: parseContent(note.content_json),
      immediatelyRender: false,
      editorProps: {
        attributes: {
          class: "tiptap-editor focus:outline-none max-w-full min-h-[200px]",
        },
      },
      onUpdate: ({ editor }) => handleSaveContent(editor),
      onCreate: ({ editor }) => setEditor(editor),
    },
    [tiptapExtensions],
  );

  return (
    <div className="w-full relative transition-opacity duration-300">
      {editor && (
        <BubbleMenu
          editor={editor}
          shouldShow={({ state, editor }) => {
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

      <SlashMenu {...slashMenuProps} editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
};

export default NotePad;
