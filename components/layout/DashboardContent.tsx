"use client"

import { useState, useCallback } from "react"
import { mutate } from "swr"
import { PanelRight } from "lucide-react"
import { toast, Toaster } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import InboxPanel from "@/components/dashboard/InboxPanel"
import TodoPanel from "@/components/dashboard/TodoPanel"
import ContextPanel from "@/components/dashboard/ContextPanel"
import type { InboxItem, AiSuggestion } from "@/lib/mock-data"

export default function DashboardContent(): React.ReactElement {
  const [isContextOpen, setIsContextOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<InboxItem | null>(null)
  const [suggestion, setSuggestion] = useState<AiSuggestion | null>(null)
  const [classifyStatus, setClassifyStatus] = useState<
    "idle" | "loading" | "error"
  >("idle")

  function handleSelect(item: InboxItem | null): void {
    setSelectedItem(item)
    setSuggestion(null)
    setClassifyStatus("idle")
  }

  const handleClassify = useCallback(async () => {
    if (!selectedItem) return
    setClassifyStatus("loading")
    try {
      const res = await fetch("/api/inbox/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: selectedItem.id }),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = (await res.json()) as AiSuggestion
      setSuggestion(data)
      setClassifyStatus("idle")
    } catch (err) {
      console.error("classify failed", err)
      setClassifyStatus("error")
    }
  }, [selectedItem])

  const handleAction = useCallback(
    async (action: AiSuggestion["suggestedAction"]) => {
      if (!selectedItem || !suggestion) return

      try {
        const res = await fetch("/api/vault/write", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, itemId: selectedItem.id, suggestion }),
        })
        if (!res.ok) throw new Error(await res.text())
        const { undoToken } = (await res.json()) as {
          ok: true
          undoToken: string
        }

        const itemTitle = selectedItem.title
        setSelectedItem(null)
        setSuggestion(null)
        setClassifyStatus("idle")

        await mutate(
          "/api/vault/inbox",
          (current: InboxItem[] | undefined) =>
            current?.filter((i) => i.id !== selectedItem.id),
          { revalidate: true },
        )

        toast.success("Done", {
          description: itemTitle,
          action: {
            label: "Undo",
            onClick: async () => {
              await fetch("/api/vault/undo", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ undoToken }),
              })
              await mutate("/api/vault/inbox")
              toast.success("Undone")
            },
          },
          duration: 10_000,
        })
      } catch (err) {
        console.error("action failed", err)
        toast.error("Action failed")
      }
    },
    [selectedItem, suggestion],
  )

  const contextPanelProps = {
    selectedItem,
    suggestion,
    classifyStatus,
    onClassify: handleClassify,
    onAction: handleAction,
  }

  return (
    <div className="flex flex-1 overflow-hidden h-full relative">
      <Toaster position="bottom-right" />

      <section
        className="flex-1 overflow-y-auto border-r border-border min-w-0"
        aria-label="Inbox"
      >
        <InboxPanel
          selectedId={selectedItem?.id ?? null}
          onSelect={handleSelect}
        />
      </section>

      <section
        className="hidden lg:flex lg:flex-col basis-[30%] shrink-0 overflow-y-auto border-r border-border"
        aria-label="Todo"
      >
        <TodoPanel />
      </section>

      <section
        className="hidden lg:flex lg:flex-col basis-[25%] shrink-0 overflow-y-auto"
        aria-label="AI Context"
      >
        <ContextPanel {...contextPanelProps} />
      </section>

      <Button
        className="lg:hidden fixed bottom-4 right-4 z-40 h-10 w-10 rounded-full shadow-lg"
        size="icon"
        aria-label="Open AI context panel"
        onClick={() => setIsContextOpen(true)}
      >
        <PanelRight className="size-4" aria-hidden="true" />
      </Button>

      <Drawer
        open={isContextOpen}
        onOpenChange={setIsContextOpen}
        direction="right"
      >
        <DrawerContent className="h-full max-w-sm w-full overflow-y-auto">
          <DrawerHeader>
            <DrawerTitle>AI Context</DrawerTitle>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto">
            <ContextPanel {...contextPanelProps} />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
