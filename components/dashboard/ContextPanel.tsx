import { Sparkles, FolderOpen } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { mockAiSuggestion, mockInboxItems, type AiSuggestion } from "@/lib/mock-data"

const ACTION_LABELS: Record<AiSuggestion["suggestedAction"], string> = {
  "add-to-todo": "Add to TODO",
  "create-note": "Create note",
  "move-to-ideas": "Move to ideas",
  watchlist: "Watchlist",
  keep: "Keep",
  delete: "Delete",
}

function getBadgeVariant(
  action: AiSuggestion["suggestedAction"],
): "default" | "secondary" | "destructive" | "outline" {
  if (action === "add-to-todo" || action === "create-note") return "default"
  if (action === "delete") return "destructive"
  return "secondary"
}

export default function ContextPanel(): React.ReactElement {
  const suggestion = mockAiSuggestion
  const inboxItem = mockInboxItems.find((item) => item.id === suggestion.inboxItemId)

  const confidencePct = Math.round(suggestion.confidence * 100)
  const actionLabel = ACTION_LABELS[suggestion.suggestedAction]
  const badgeVariant = getBadgeVariant(suggestion.suggestedAction)

  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
          AI Context
        </span>
        <Sparkles className="text-accent" size={14} aria-hidden="true" />
      </div>

      <ScrollArea className="flex-1">
        {!inboxItem ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center gap-2 p-6 text-center h-full">
            <Sparkles className="text-muted-foreground" size={20} aria-hidden="true" />
            <p className="text-xs text-muted-foreground">Analyzing&hellip;</p>
          </div>
        ) : (
          /* AI suggestion card */
          <div className="p-4 flex flex-col gap-3">
            {/* Inbox item title */}
            <p className="text-sm font-medium truncate" title={inboxItem.title}>
              {inboxItem.title}
            </p>

            <Separator />

            {/* Suggested action */}
            <div className="flex items-center gap-2">
              <Badge variant={badgeVariant} className="shrink-0">
                {actionLabel}
              </Badge>
              <span className="text-xs text-muted-foreground">suggested action</span>
            </div>

            {/* Confidence bar */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Confidence</span>
                <span className="text-xs text-muted-foreground">{confidencePct}%</span>
              </div>
              <div
                className="w-full h-1.5 bg-muted rounded overflow-hidden"
                role="progressbar"
                aria-valuenow={confidencePct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Confidence: ${confidencePct}%`}
              >
                <div
                  className="h-full bg-accent rounded"
                  style={{ width: `${confidencePct}%` }}
                />
              </div>
            </div>

            {/* Reasoning */}
            <p className="text-xs text-muted-foreground italic">{suggestion.reasoning}</p>

            {/* Destination path */}
            {suggestion.destinationPath && (
              <div className="flex items-center gap-1.5">
                <FolderOpen className="text-muted-foreground shrink-0" size={12} aria-hidden="true" />
                <span className="font-mono text-xs text-muted-foreground truncate" title={suggestion.destinationPath}>
                  {suggestion.destinationPath}
                </span>
              </div>
            )}

            <Separator />

            {/* Action buttons */}
            <div className="flex flex-col gap-2">
              <Button
                size="sm"
                className="w-full text-xs bg-accent text-accent-foreground hover:bg-accent/90"
                disabled
                aria-label={`Accept suggestion: ${actionLabel}`}
              >
                {actionLabel}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="w-full text-xs"
                disabled
                aria-label="Skip suggestion"
              >
                Skip
              </Button>
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
