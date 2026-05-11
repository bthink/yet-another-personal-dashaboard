"use client";

import { Sheet, SheetContent } from "@/components/ui/sheet";
import Sidebar from "@/components/layout/Sidebar";
import { useMobileNav } from "@/components/layout/MobileNavProvider";

export default function SidebarSheet() {
  const { isSidebarOpen, closeSidebar } = useMobileNav();

  return (
    <Sheet open={isSidebarOpen} onOpenChange={(open) => !open && closeSidebar()}>
      <SheetContent side="left" className="w-60 p-0">
        <Sidebar />
      </SheetContent>
    </Sheet>
  );
}
