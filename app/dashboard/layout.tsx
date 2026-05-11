import type { ReactNode } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import CommandPaletteProvider from "@/components/layout/CommandPaletteProvider";
import MobileNavProvider from "@/components/layout/MobileNavProvider";
import SidebarSheet from "@/components/layout/SidebarSheet";

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <CommandPaletteProvider>
      <MobileNavProvider>
        <div className="flex h-screen overflow-hidden">
          {/* Desktop sidebar - always visible on lg+ */}
          <div className="hidden lg:flex">
            <Sidebar />
          </div>

          {/* Mobile sidebar Sheet */}
          <SidebarSheet />

          <div className="flex flex-col flex-1 overflow-hidden min-w-0">
            <Topbar />
            <div className="flex flex-1 overflow-hidden">{children}</div>
          </div>
        </div>
      </MobileNavProvider>
    </CommandPaletteProvider>
  );
}
