"use client";

import { FC, useEffect, useRef, useState } from "react";
import { Crepe } from "@milkdown/crepe";
import { collab, collabServiceCtx } from "@milkdown/plugin-collab";
import * as Y from "yjs";
import { usePowerSync } from "@powersync/react"; // Adjust based on your setup
import "@milkdown/crepe/theme/common/style.css";
import { NoteRecord, NoteType } from "@/lib/powersync/app-schema";
import debounce from "lodash.debounce";
import { useNote } from "@/hooks/use-note";

const NotePad: FC<{ note: NoteType }> = ({ note }) => {
  const divRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);

  const activeDocRef = useRef<Y.Doc | null>(null);
  const isInitializedRef = useRef(false);
  // 1. PowerSync instances
  const powerSync = usePowerSync();

  const { updateNoteContent } = useNote();

  useEffect(() => {
    // Only initialize once we have the container and the initial note data
    if (!divRef.current || !note || isInitializedRef.current) return;

    let ignore = false;
    let crepeInstance: Crepe | null = null;

    const init = async () => {
      // 2. Initialize a fresh Yjs Document
      const doc = new Y.Doc();
      activeDocRef.current = doc;

      // 3. Load existing state from PowerSync (assuming it's stored as a Uint8Array or base64 string)
      if (note.content) {
        try {
          // Note: If you store it as a base64 string in SQLite, decode it to Uint8Array first.
          // If your DB returns a buffer/Uint8Array, you can pass it directly.
          const binaryState =
            typeof note.content === "string"
              ? Uint8Array.from(atob(note.content), (c) => c.charCodeAt(0))
              : note.content;

          Y.applyUpdate(doc, binaryState);
        } catch (e) {
          console.error("Failed to parse Yjs document state from PowerSync", e);
        }
      }

      const handleUpdate = debounce(() => {
        // Encode the full document state
        const stateVector = Y.encodeStateAsUpdate(doc);
        // Convert to base64 for safe SQLite text column storage (or save raw if using BLOB)
        const base64State = btoa(
          String.fromCharCode.apply(null, stateVector as any),
        );

        updateNoteContent(note.id, base64State, note.is_synced);
      }, 300);

      // 4. Listen for local editor changes and save them back to PowerSync
      doc.on("update", handleUpdate);

      if (ignore) return;

      // Clear container to prevent the double editor bug
      if (divRef.current) {
        divRef.current.innerHTML = "";
      }

      crepeInstance = new Crepe({
        root: divRef.current,
        defaultValue: "",
        featureConfigs: {
          [Crepe.Feature.ImageBlock]: {
            // 1. Returning null/empty string hides the upload buttons in the UI
            inlineUploadButton: "",
            blockUploadButton: "",

            // 2. Set onUpload to undefined to prevent the internal trigger
            onUpload: undefined,

            // Optional: customize the placeholder to make it clear for users
            inlineUploadPlaceholderText: "Enter image URL...",
            blockUploadPlaceholderText: "Paste an image link here...",
          },
        },
      });

      crepeInstance.editor.use(collab);
      await crepeInstance.create();

      if (ignore) {
        crepeInstance.destroy();
        return;
      }

      // crepeInstance.editor.config((ctx) => {
      //   // We can intercept the uploader and make it a no-op
      //   // or disable the HTML file uploader which handles pasted images.
      //   import("@milkdown/plugin-upload").then(({ uploadConfig }) => {
      //     ctx.update(uploadConfig.key, (prev) => ({
      //       ...prev,
      //       // Returning an empty fragment or null effectively cancels the upload
      //       uploader: () => Promise.resolve([]),
      //       // Prevents images copied via "Copy Image" in browser from being uploaded as files
      //       enableHtmlFileUploader: false,
      //     }));
      //   });
      // });

      crepeInstance.editor.action((ctx) => {
        const collabService = ctx.get(collabServiceCtx);
        // Bind the document to the editor
        collabService.bindDoc(doc).connect();
      });

      isInitializedRef.current = true;
      setIsReady(true);
    };

    init();

    return () => {
      // Cleanup
      ignore = true;
      setIsReady(false);
      isInitializedRef.current = false;

      if (crepeInstance) {
        crepeInstance.destroy();
      }
      if (activeDocRef.current) {
        activeDocRef.current.destroy();
        activeDocRef.current = null;
      }
    };
  }, [powerSync]); // Keep dependencies tight

  return (
    <div className="w-full relative">
      <div
        ref={divRef}
        className={`w-full transition-opacity duration-300 ${
          isReady ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
};

export default NotePad;
