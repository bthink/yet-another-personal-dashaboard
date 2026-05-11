"use client";

import { useState } from "react";
import { PanelRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import InboxPanel from "@/components/dashboard/InboxPanel";
import TodoPanel from "@/components/dashboard/TodoPanel";
import ContextPanel from "@/components/dashboard/ContextPanel";

export default function DashboardContent(): React.ReactElement {
  const [isContextOpen, setIsContextOpen] = useState(false);

  return (
    <div className="flex flex-1 overflow-hidden h-full relative">
      {/* InboxPanel - always visible, takes full width on mobile */}
      <section
        className="flex-1 overflow-y-auto border-r border-border min-w-0"
        aria-label="Inbox"
      >
        <InboxPanel />
      </section>

      {/* TodoPanel - hidden on <lg */}
      <section
        className="hidden lg:flex lg:flex-col basis-[30%] shrink-0 overflow-y-auto border-r border-border"
        aria-label="Todo"
      >
        <TodoPanel />
      </section>

      {/* ContextPanel - hidden on <lg, always visible on lg+ */}
      <section
        className="hidden lg:flex lg:flex-col basis-[25%] shrink-0 overflow-y-auto"
        aria-label="AI Context"
      >
        <ContextPanel />
      </section>

      {/* Floating context panel button - mobile only */}
      <Button
        className="lg:hidden fixed bottom-4 right-4 z-40 h-10 w-10 rounded-full shadow-lg"
        size="icon"
        aria-label="Open AI context panel"
        onClick={() => setIsContextOpen(true)}
      >
        <PanelRight className="size-4" aria-hidden="true" />
      </Button>

      {/* Context panel Drawer - mobile only */}
      <Drawer open={isContextOpen} onOpenChange={setIsContextOpen} direction="right">
        <DrawerContent className="h-full max-w-sm w-full overflow-y-auto">
          <DrawerHeader>
            <DrawerTitle>AI Context</DrawerTitle>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto">
            <ContextPanel />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
