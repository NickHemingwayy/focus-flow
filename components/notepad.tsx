"use client";

import { Crepe } from "@milkdown/crepe";
import { collab, collabServiceCtx } from "@milkdown/plugin-collab";
import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";
import { Awareness } from "y-protocols/awareness"; // Necessary for cursor state
import "@milkdown/crepe/theme/common/style.css";
import { FC, useEffect, useRef, useState } from "react";

const NotePad: FC<{ noteId: number }> = ({ noteId }) => {
  const divRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!divRef.current) return;

    // 1. Initialize Yjs Doc & Local Persistence
    const doc = new Y.Doc();
    const persistence = new IndexeddbPersistence(`note-${noteId}`, doc);

    // 2. Create standalone Awareness (since IDB doesn't provide it)
    const awareness = new Awareness(doc);

    // 3. Initialize Crepe
    const crepe = new Crepe({
      root: divRef.current,
      defaultValue: "",
    });

    // 4. Inject Collab Plugin
    crepe.editor.use(collab);

    crepe.create().then(() => {
      // 5. Wait for IndexedDB to restore existing data
      persistence.on("synced", () => {
        crepe.editor.action((ctx) => {
          const collabService = ctx.get(collabServiceCtx);

          collabService
            .bindDoc(doc)
            .setAwareness(awareness) // Use our manual awareness
            .connect();
        });
        setIsReady(true);
      });
    });

    return () => {
      persistence.destroy();
      awareness.destroy();
      crepe.destroy();
      doc.destroy();
    };
  }, [noteId]);

  return (
    <div className="w-full h-full relative">
      <div
        ref={divRef}
        className={`w-full h-full ${isReady ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
};

export default NotePad;
