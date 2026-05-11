import type { ReactNode } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import CommandPaletteProvider from "@/components/layout/CommandPaletteProvider";

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <CommandPaletteProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <Topbar />
          <div className="flex flex-1 overflow-hidden">{children}</div>
        </div>
      </div>
    </CommandPaletteProvider>
  );
}
