import { Extension } from "@tiptap/core";
import { Suggestion } from "@tiptap/suggestion";
import { SlashItem, filterItems } from "./items";

export type SlashCommandCallbacks = {
  onStart: (items: SlashItem[], view: any, range: any) => void;
  onUpdate: (items: SlashItem[], view: any, range: any) => void;
  onExit: () => void;
  onKeyDown: (event: KeyboardEvent) => boolean;
};

/**
 * Creates the SlashCommand TipTap extension with callbacks wired to the
 * SlashMenu React component via stable refs. Defined as a factory outside
 * React so TipTap never re-registers the ProseMirror plugin on re-render.
 */
export function createSlashCommandExtension(callbacks: SlashCommandCallbacks) {
  return Extension.create({
    name: "slashCommand",

    addOptions() {
      return {
        suggestion: {
          char: "/",
          startOfLine: false,
          allowSpaces: false,

          items: ({ query }: { query: string }) => filterItems(query),

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

          render: () => ({
            onStart: ({ query, range, editor }: any) => {
              callbacks.onStart(filterItems(query), editor.view, range);
            },
            onUpdate: ({ query, range, editor }: any) => {
              callbacks.onUpdate(filterItems(query), editor.view, range);
            },
            onExit: () => {
              callbacks.onExit();
            },
            onKeyDown: ({ event }: { event: KeyboardEvent }) => {
              return callbacks.onKeyDown(event);
            },
          }),
        },
      };
    },

    addProseMirrorPlugins() {
      return [Suggestion({ editor: this.editor, ...this.options.suggestion })];
    },
  });
}
