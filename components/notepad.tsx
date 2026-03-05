"use client";
// You can choose a specific theme, for example:

import { Crepe } from "@milkdown/crepe";
import { Milkdown, MilkdownProvider, useEditor } from "@milkdown/react";
import "@milkdown/crepe/theme/common/style.css";
// import "@milkdown/crepe/theme/frame.css";
import { FC, useLayoutEffect, useRef } from "react";

const NotePad: FC<{ value: string }> = ({ value }) => {
  // const { theme } = useTheme();
  const divRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!divRef.current) return;

    const crepe = new Crepe({
      root: divRef.current,
      defaultValue: value,
    });

    crepe.create();

    // Clean up the editor instance on component unmount
    return () => {
      crepe.destroy();
    };
  }, [value]); // Re-run if the initial value changes

  return <div ref={divRef} className="w-full h-full max-w-full" />;
};

export default NotePad;
