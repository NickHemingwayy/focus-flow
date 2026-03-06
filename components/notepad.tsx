"use client";

import { Crepe } from "@milkdown/crepe";
import { listenerCtx } from "@milkdown/plugin-listener"; // Add this
import "@milkdown/crepe/theme/common/style.css";
import { FC, useEffect, useRef } from "react";

const NotePad: FC<{ value: string; onChange?: (markdown: string) => void }> = ({
  value,
  onChange,
}) => {
  const divRef = useRef<HTMLDivElement>(null);
  const crepeRef = useRef<Crepe | null>(null);

  useEffect(() => {
    if (!divRef.current) return;

    const crepe = new Crepe({
      root: divRef.current,
      defaultValue: value,
    });

    crepe.editor.config((ctx) => {
      ctx.get(listenerCtx).updated((ctx) => {
        const doc = crepe.getMarkdown();
        if (onChange) {
          onChange(doc);
        }
      });
    });

    crepe.create().then(() => {
      crepeRef.current = crepe;
    });

    return () => {
      crepe.destroy();
    };
    // Note: Empty dependency array ensures we don't re-init on every keystroke
    // If you need to update content from props, use a separate effect.
  }, []);

  return <div ref={divRef} className="w-full h-full" />;
};

export default NotePad;
