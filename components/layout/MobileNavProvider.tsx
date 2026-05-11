"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface MobileNavContextValue {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;
}

const MobileNavContext = createContext<MobileNavContextValue | null>(null);

export function useMobileNav(): MobileNavContextValue {
  const ctx = useContext(MobileNavContext);
  if (!ctx) {
    throw new Error("useMobileNav must be used within MobileNavProvider");
  }
  return ctx;
}

interface Props {
  children: ReactNode;
}

export default function MobileNavProvider({ children }: Props) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <MobileNavContext.Provider value={{ isSidebarOpen, toggleSidebar, closeSidebar }}>
      {children}
    </MobileNavContext.Provider>
  );
}
