// components/dashboard/ContextPanel.tsx
"use client"

import { useState } from "react"
import { Sparkles, FolderOpen, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import DiffPreviewSheet from "@/components/dashboard/DiffPreviewSheet"
import type { InboxItem, AiSuggestion } from "@/lib/mock-data"

interface ContextPanelProps {
  selectedItem: InboxItem | null
  suggestion: AiSuggestion | null
  classifyStatus: "idle" | "loading" | "error"
  onClassify: () => void
  onAction: (action: AiSuggestion["suggestedAction"]) => void
}

const ACTION_LABELS: Record<AiSuggestion["suggestedAction"], string> = {
  "add-to-todo": "Add to TODO",
  "create-note": "Create note",
  "move-to-ideas": "Move to ideas",
  watchlist: "Watchlist",
  keep: "Keep",
  delete: "Delete",
}

export default function ContextPanel({
  selectedItem,
  suggestion,
  classifyStatus,
  onClassify,
  onAction,
}: ContextPanelProps): React.ReactElement {
  const [previewOpen, setPreviewOpen] = useState(false)

  const confidencePct = suggestion
    ? Math.round(suggestion.confidence * 100)
    : 0

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
          AI Context
        </span>
        <Sparkles className="text-accent" size={14} aria-hidden="true" />
      </div>

      <ScrollArea className="flex-1">
        {/* State: no selection */}
        {!selectedItem && (
          <div className="flex flex-col items-center justify-center gap-2 p-6 text-center">
            <Sparkles
              className="text-muted-foreground"
              size={20}
              aria-hidden="true"
            />
            <p className="text-xs text-muted-foreground">
              Select an inbox item
            </p>
          </div>
        )}

        {/* State: classifying */}
        {selectedItem && classifyStatus === "loading" && (
          <div className="flex flex-col items-center justify-center gap-2 p-6 text-center">
            <Loader2
              className="text-muted-foreground animate-spin"
              size={20}
              aria-hidden="true"
            />
            <p className="text-xs text-muted-foreground">Analyzing...</p>
          </div>
        )}

        {/* State: error */}
        {selectedItem && classifyStatus === "error" && (
          <div className="p-4 flex flex-col gap-3">
            <p
              className="text-sm font-medium truncate"
              title={selectedItem.title}
            >
              {selectedItem.title}
            </p>
            <p className="text-xs text-destructive">
              Classification failed. Try again.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={onClassify}
              className="w-full text-xs"
            >
              Retry
            </Button>
          </div>
        )}

        {/* State: item selected, not yet classified */}
        {selectedItem && classifyStatus === "idle" && !suggestion && (
          <div className="p-4 flex flex-col gap-3">
            <p
              className="text-sm font-medium truncate"
              title={selectedItem.title}
            >
              {selectedItem.title}
            </p>
            <Separator />
            <Button
              size="sm"
              onClick={onClassify}
              className="w-full text-xs bg-accent text-accent-foreground hover:bg-accent/90"
              aria-label="Classify this item with AI"
            >
              Classify
            </Button>
          </div>
        )}

        {/* State: suggestion ready */}
        {selectedItem && classifyStatus === "idle" && suggestion && (
          <div className="p-4 flex flex-col gap-3">
            <p
              className="text-sm font-medium truncate"
              title={selectedItem.title}
            >
              {selectedItem.title}
            </p>

            <Separator />

            <div className="flex items-center gap-2">
              <Badge className="shrink-0">
                {ACTION_LABELS[suggestion.suggestedAction]}
              </Badge>
              <span className="text-xs text-muted-foreground">suggested</span>
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Confidence
                </span>
                <span className="text-xs text-muted-foreground">
                  {confidencePct}%
                </span>
              </div>
              <div
                className="w-full h-1.5 bg-muted rounded overflow-hidden"
                role="progressbar"
                aria-valuenow={confidencePct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={"Confidence: " + confidencePct + "%"}
              >
                <div
                  className="h-full bg-accent rounded"
                  style={{ width: confidencePct + "%" }}
                />
              </div>
            </div>

            <p className="text-xs text-muted-foreground italic">
              {suggestion.reasoning}
            </p>

            {suggestion.destinationPath && (
              <div className="flex items-center gap-1.5">
                <FolderOpen
                  className="text-muted-foreground shrink-0"
                  size={12}
                  aria-hidden="true"
                />
                <span
                  className="font-mono text-xs text-muted-foreground truncate"
                  title={suggestion.destinationPath}
                >
                  {suggestion.destinationPath}
                </span>
              </div>
            )}

            <Separator />

            <div className="flex flex-col gap-2">
              <Button
                size="sm"
                onClick={() => setPreviewOpen(true)}
                className="w-full text-xs bg-accent text-accent-foreground hover:bg-accent/90"
                aria-label={"Accept: " + ACTION_LABELS[suggestion.suggestedAction]}
              >
                {ACTION_LABELS[suggestion.suggestedAction]}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onAction("keep")}
                className="w-full text-xs"
                aria-label="Skip - remove from inbox without action"
              >
                Skip
              </Button>
            </div>
          </div>
        )}
      </ScrollArea>

      {suggestion && (
        <DiffPreviewSheet
          open={previewOpen}
          suggestion={suggestion}
          onConfirm={() => {
            setPreviewOpen(false)
            onAction(suggestion.suggestedAction)
          }}
          onCancel={() => setPreviewOpen(false)}
        />
      )}
    </div>
  )
}
