"use client";

import { Crepe } from "@milkdown/crepe";
import { collab, collabServiceCtx } from "@milkdown/plugin-collab";
import * as Y from "yjs";
import { DexieYProvider } from "y-dexie";
import { db, Note } from "@/lib/db";
import "@milkdown/crepe/theme/common/style.css";
import { FC, useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";

const NotePad: FC<{ noteId: string }> = ({ noteId }) => {
  const divRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);
  const activeDocRef = useRef<Y.Doc | null>(null);

  const localNote = useLiveQuery(() => db.localNotes.get(noteId));
  const syncedNote = useLiveQuery(() => db.syncedNotes.get(noteId));
  const note = localNote ?? syncedNote;

  useEffect(() => {
    if (!divRef.current || !note) return;

    // 1. Setup flags for strict mode / cleanup
    let ignore = false;
    let crepeInstance: Crepe | null = null;

    const init = async () => {
      if (ignore || (!localNote && !syncedNote) || !note.content) return;

      const doc = note.content;
      activeDocRef.current = doc;

      const provider = DexieYProvider.load(doc);
      await provider.whenLoaded;

      if (ignore) {
        DexieYProvider.release(doc);
        return;
      }

      // 2. CRITICAL: Clear the container before creating the editor
      // This prevents the "double editor" bug
      if (divRef.current) {
        divRef.current.innerHTML = "";
      }

      crepeInstance = new Crepe({
        root: divRef.current,
        defaultValue: "",
      });

      crepeInstance.editor.use(collab);
      await crepeInstance.create();

      if (ignore) {
        crepeInstance.destroy();
        return;
      }

      crepeInstance.editor.action((ctx) => {
        const collabService = ctx.get(collabServiceCtx);
        collabService.bindDoc(doc).setAwareness(provider.awareness).connect();
      });

      setIsReady(true);
    };

    init();

    return () => {
      ignore = true; // Prevents async logic from finishing if unmounted
      setIsReady(false);

      if (crepeInstance) {
        crepeInstance.destroy();
      }

      if (activeDocRef.current) {
        DexieYProvider.release(activeDocRef.current);
        activeDocRef.current = null;
      }
    };
  }, [note]);

  return (
    <div className="w-full h-full relative">
      <div
        ref={divRef}
        className={`w-full h-full transition-opacity duration-300 ${
          isReady ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
};

export default NotePad;
