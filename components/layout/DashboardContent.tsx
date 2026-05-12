"use client";

import { useState } from "react";
import useSWR from "swr";
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
import type { InboxItem } from "@/lib/mock-data";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function DashboardContent(): React.ReactElement {
  const [isContextOpen, setIsContextOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: inboxItems = [], isLoading, mutate: mutateInbox } = useSWR<InboxItem[]>(
    "/api/vault/inbox",
    fetcher,
    { refreshInterval: 30_000 },
  );

  const { data: healthData } = useSWR<{ ok: boolean; vaultName: string }>(
    "/api/vault/health",
    fetcher,
  );

  const selectedItem = selectedId
    ? (inboxItems.find((item) => item.id === selectedId) ?? null)
    : null;

  function handleSelect(id: string): void {
    setSelectedId((prev) => (prev === id ? null : id));
  }

  function handleWriteSuccess(): void {
    setSelectedId(null);
    void mutateInbox();
  }

  return (
    <div className="flex flex-1 overflow-hidden h-full relative">
      {/* InboxPanel - always visible, takes full width on mobile */}
      <section
        className="flex-1 overflow-y-auto border-r border-border min-w-0"
        aria-label="Inbox"
      >
        <InboxPanel
          items={inboxItems}
          isLoading={isLoading}
          selectedId={selectedId}
          vaultName={healthData?.vaultName}
          onSelect={handleSelect}
        />
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
        <ContextPanel
          selectedItem={selectedItem}
          onWriteSuccess={handleWriteSuccess}
        />
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
            <ContextPanel
              selectedItem={selectedItem}
              onWriteSuccess={handleWriteSuccess}
            />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
