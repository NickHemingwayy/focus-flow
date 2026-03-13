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
import { Node, mergeAttributes } from "@tiptap/core";
import * as Y from "yjs";
import { usePowerSync } from "@powersync/react";
import { NoteType } from "@/lib/powersync/app-schema";
import debounce from "lodash.debounce";
import { useNote } from "@/hooks/use-note";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSlashMenu, SlashMenu } from "./slash-menu";

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

// ─── Image URL input node ─────────────────────────────────────────────────────
// Renders a URL input when no src is set. Once committed, renders the image
// with left/right resize handles that update the width attribute directly.

const MIN_IMG_WIDTH = 80;

const ImageUrlNodeView: FC<{
  node: any;
  updateAttributes: (attrs: any) => void;
  selected: boolean;
}> = ({ node, updateAttributes, selected }) => {
  // Use a ref for the draft value so it is never stale inside commit(),
  // regardless of how TipTap schedules re-renders for atom nodes.
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

  const currentWidth: number = node.attrs.width ?? 500;

  const commit = () => {
    const trimmed = draftRef.current.trim();
    if (!trimmed) return;
    updateAttributes({ src: trimmed });
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

// ─── Component ───────────────────────────────────────────────────────────────

const NotePad: FC<{ note: NoteType }> = ({ note }) => {
  const [isReady, setIsReady] = useState(false);
  const [initialContent, setInitialContent] = useState<Record<
    string,
    unknown
  > | null>(null);

  const ydocRef = useRef<Y.Doc | null>(null);
  const isInitializedRef = useRef(false);
  const powerSync = usePowerSync();
  const { updateNoteContent } = useNote();

  const { slashExtension, setEditor, slashMenuProps } = useSlashMenu();

  const debouncedSave = useRef(
    debounce((doc: Y.Doc, noteId: string, isSynced: number) => {
      updateNoteContent(noteId, encodeState(doc), isSynced);
    }, 300),
  ).current;

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
        slashExtension,
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
        setEditor(editor);
      },
    },
    [isReady],
  );

  if (!isReady) return <div className="w-full opacity-0" />;

  return (
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

      {/* Slash command menu */}
      <SlashMenu {...slashMenuProps} editor={editor} />

      <EditorContent editor={editor} />
    </div>
  );
};

export default NotePad;
