"use client";

import { useState, useEffect, type ReactNode } from "react";
import CommandPalette from "@/components/layout/CommandPalette";

interface Props {
  children: ReactNode;
}

export default function CommandPaletteProvider({ children }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      {children}
      {isOpen && <CommandPalette onClose={() => setIsOpen(false)} />}
    </>
  );
}
