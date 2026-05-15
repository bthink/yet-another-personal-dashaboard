"use client";

import { useState, useCallback } from "react";
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
import type { InboxItem, AiSuggestion } from "@/lib/mock-data";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function DashboardContent(): React.ReactElement {
  const [isContextOpen, setIsContextOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [inboxItems, setInboxItems] = useState<InboxItem[]>([]);
  const [suggestion, setSuggestion] = useState<AiSuggestion | null>(null);
  const [classifyStatus, setClassifyStatus] = useState<"idle" | "loading" | "error">("idle");

  const selectedItem = inboxItems.find((item) => item.id === selectedId) ?? null;

  const handleSelect = useCallback((id: string) => {
    setSelectedId((prev) => {
      if (prev === id) return null;
      // Clear suggestion when selecting a different item
      setSuggestion(null);
      setClassifyStatus("idle");
      return id;
    });
  }, []);

  const handleClassify = useCallback(async () => {
    if (!selectedItem) return;
    setClassifyStatus("loading");
    try {
      const res = await fetch(`/api/inbox/classify?file=${encodeURIComponent(selectedItem.id)}`);
      if (!res.ok) throw new Error("classify failed");
      const data = await res.json() as AiSuggestion;
      setSuggestion(data);
      setClassifyStatus("idle");
    } catch {
      setClassifyStatus("error");
    }
  }, [selectedItem]);

  const handleAction = useCallback((action: AiSuggestion["suggestedAction"]) => {
    // Remove item from list after action
    setInboxItems((prev) => prev.filter((item) => item.id !== selectedId));
    setSelectedId(null);
    setSuggestion(null);
    setClassifyStatus("idle");
  }, [selectedId]);

  const contextPanel = (
    <ContextPanel
      selectedItem={selectedItem}
      suggestion={suggestion}
      classifyStatus={classifyStatus}
      onClassify={handleClassify}
      onAction={handleAction}
    />
  );

  return (
    <div className="flex flex-1 overflow-hidden h-full relative">
      {/* InboxPanel - always visible, takes full width on mobile */}
      <section
        className="flex-1 overflow-y-auto border-r border-border min-w-0"
        aria-label="Inbox"
      >
        <InboxPanel selectedId={selectedId} onSelect={handleSelect} />
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
        {contextPanel}
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
            {contextPanel}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
