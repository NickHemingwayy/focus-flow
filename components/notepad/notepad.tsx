"use client";

import { FC, use, useEffect, useMemo, useRef, useState } from "react";
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
import { Markdown } from "@tiptap/markdown";
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
  const powerSync = usePowerSync();
  const { updateNoteContent } = useNote();

  const { slashExtension, setEditor, slashMenuProps } = useSlashMenu();

  const ydoc = useMemo(() => {
    return new Y.Doc();
  }, [note?.id]);

  useEffect(() => {
    if (note.is_public !== 1) return;
    const provider = new PowerSyncYjsProvider(ydoc, powerSync, note.id);

    return () => {
      provider.destroy();
    };
  }, [ydoc, note.id]);

  const handleSaveContent = debounce((editor: Editor) => {
    const markdown = editor.getMarkdown();
    updateNoteContent(note.id, markdown, note.is_synced);
  }, 300);

  const tiptapExtensions = useMemo(() => {
    const base = [
      StarterKit,
      Markdown,
      TaskList,
      TaskItem.configure({ nested: true }),
      ImageUrlExtension,
      Placeholder.configure({
        placeholder: "Start writing, or type '/' for commands…",
      }),
      slashExtension,
    ];

    if (note.is_public !== 1) {
      return base;
    }

    return [...base, Collaboration.configure({ document: ydoc })];
  }, [note.is_public]);

  // ── TipTap editor ────────────────────────────────────────────────────────
  const editor = useEditor(
    {
      extensions: tiptapExtensions,
      content: note.content_md,
      contentType: "markdown",
      immediatelyRender: false,
      editorProps: {
        attributes: {
          class: "tiptap-editor focus:outline-none max-w-full min-h-[200px]",
        },
      },
      onUpdate: ({ editor }) => {
        handleSaveContent(editor);
      },
      onCreate: ({ editor }) => {
        setEditor(editor);
      },
    },
    [tiptapExtensions],
  );

  return (
    <div className={`w-full relative transition-opacity duration-300`}>
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
