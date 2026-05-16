'use client'

import { useState } from "react"
import useSWR from "swr"
import {
  Sparkles,
  FolderOpen,
  CheckSquare,
  FileText,
  Lightbulb,
  BookMarked,
  Archive,
  Trash2,
  Loader2,
  X,
  AlertTriangle,
} from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import type { ClassifyResult, InboxItem, WriteAction } from "@/lib/mock-data"
import type { SearchResult } from "@/lib/search"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const ACTION_META: Record<
  WriteAction,
  { label: string; icon: React.ElementType; danger?: boolean }
> = {
  "add-to-todo":   { label: "Add to TODO",      icon: CheckSquare },
  "create-note":   { label: "Create note",       icon: FileText },
  "move-to-ideas": { label: "Move to ideas",     icon: Lightbulb },
  watchlist:       { label: "Add to watchlist",  icon: BookMarked },
  keep:            { label: "Keep in inbox",     icon: Archive },
  delete:          { label: "Delete",            icon: Trash2, danger: true },
}

function confidenceColor(c: number): string {
  if (c >= 0.8) return "bg-[var(--green)]"
  if (c >= 0.5) return "bg-[var(--amber)]"
  return "bg-muted-foreground/40"
}

/** Derives the MOC/index path from a destination like "03_Knowledge/IT/RAG" -> "03_Knowledge/IT/IT.md" */
function deriveIndexPath(destinationPath: string | undefined, _noteTitle: string): string | null {
  if (!destinationPath) return null
  const parts = destinationPath.split("/")
  // Expect at least: 03_Knowledge / <subfolder> / <filename>
  if (parts.length < 3 || parts[0] !== "03_Knowledge") return null
  const subfolder = parts[1]
  return `03_Knowledge/${subfolder}/${subfolder}.md`
}

function diffDescription(
  action: WriteAction,
  result: ClassifyResult,
  item: InboxItem,
): string {
  switch (action) {
    case "delete":
      return `"${item.title}" will be permanently deleted from 97_Inbox/.`
    case "move-to-ideas":
      return `File will be moved from 97_Inbox/ to 04_Ideas/.`
    case "create-note": {
      const base = `Note will be created at ${result.destinationPath ?? "suggested path"}.md and removed from inbox.`
      const indexSuggestion = deriveIndexPath(result.destinationPath, item.title)
      return indexSuggestion ? `${base}\n\n💡 Also consider adding [[${item.title}]] to ${indexSuggestion}` : base
    }
    case "add-to-todo":
      return `Task will be appended to 00_System/TODO.md:\n- [ ] ${result.todoText ?? item.title}`
    case "watchlist":
      return `Link will be appended to 00_System/Do obejrzenia i przeczytania.md and removed from inbox.`
    case "keep":
      return `File will be moved to 97_Inbox/_kept/ (hidden from main inbox view).`
  }
}

interface ContextPanelProps {
  selectedItem: InboxItem | null
  onWriteSuccess: () => void
}

export default function ContextPanel({
  selectedItem,
  onWriteSuccess,
}: ContextPanelProps): React.ReactElement {
  const [pendingAction, setPendingAction] = useState<WriteAction | null>(null)
  const [isWriting, setIsWriting] = useState(false)

  const { data: classifyResult, isLoading: isClassifying, error: classifyError } = useSWR<ClassifyResult>(
    selectedItem ? `/api/inbox/classify?itemId=${selectedItem.id}` : null,
    fetcher,
    { revalidateOnFocus: false },
  )

  const isDuplicateCheckEnabled =
    selectedItem !== null &&
    classifyResult?.suggestedAction === "create-note"

  const { data: duplicateResults } = useSWR<SearchResult[]>(
    isDuplicateCheckEnabled
      ? `/api/vault/search?q=${encodeURIComponent(selectedItem!.title)}`
      : null,
    fetcher,
    { revalidateOnFocus: false },
  )

  const similarNotes = (duplicateResults ?? [])
    .filter((r) => r.folder === "03_Knowledge" && r.score < 0.4)
    .slice(0, 3)

  async function handleConfirm(): Promise<void> {
    if (!pendingAction || !selectedItem || !classifyResult) return
    setIsWriting(true)
    try {
      const res = await fetch("/api/vault/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: pendingAction,
          itemId: selectedItem.id,
          destinationPath: classifyResult.destinationPath,
          todoText: classifyResult.todoText ?? selectedItem.title,
        }),
      })

      const json = await res.json() as { ok?: boolean; backupId?: string; error?: string }
      if (!res.ok || !json.ok) {
        toast.error(json.error ?? "Write failed")
        return
      }

      const { backupId } = json
      const label = ACTION_META[pendingAction].label
      const itemId = selectedItem.id

      toast.success(`${label} — done`, {
        action: backupId
          ? {
              label: "Undo",
              onClick: () => void handleUndo(backupId, itemId),
            }
          : undefined,
      })

      setPendingAction(null)
      onWriteSuccess()
    } catch {
      toast.error("Network error")
    } finally {
      setIsWriting(false)
    }
  }

  async function handleUndo(backupId: string, itemId: string): Promise<void> {
    try {
      const res = await fetch("/api/vault/write/undo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backupId, itemId }),
      })
      const json = await res.json() as { ok?: boolean; error?: string }
      if (!res.ok || !json.ok) {
        toast.error(json.error ?? "Undo failed")
        return
      }
      toast.success("Undo successful — item restored to inbox")
      onWriteSuccess()
    } catch {
      toast.error("Undo failed")
    }
  }

  // ── Empty state ──────────────────────────────────────────────────────────
  if (!selectedItem) {
    return (
      <div className="flex flex-col h-full">
        <PanelHeader />
        <div className="flex flex-col items-center justify-center gap-2 p-6 text-center flex-1">
          <Sparkles className="text-muted-foreground" size={20} aria-hidden="true" />
          <p className="text-xs text-muted-foreground">Select an inbox item to classify</p>
        </div>
      </div>
    )
  }

  const pct = classifyResult ? Math.round(classifyResult.confidence * 100) : 0

  return (
    <div className="flex flex-col h-full">
      <PanelHeader />

      <ScrollArea className="flex-1">
        <div className="p-4 flex flex-col gap-3">
          {/* Item title */}
          <p className="text-sm font-medium truncate" title={selectedItem.title}>
            {selectedItem.title}
          </p>

          <Separator />

          {/* Loading */}
          {isClassifying && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
              <Loader2 size={12} className="animate-spin" aria-hidden="true" />
              Classifying…
            </div>
          )}

          {/* Error */}
          {classifyError && !isClassifying && (
            <div className="flex items-start gap-2 text-xs text-[var(--red)]">
              <AlertTriangle size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>Classification failed. Check your API key.</span>
            </div>
          )}

          {/* Result */}
          {classifyResult && !isClassifying && (
            <>
              {/* Suggested action badge */}
              <div className="flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className="shrink-0 text-[10.5px] bg-accent/10 text-accent border-accent/20"
                >
                  {ACTION_META[classifyResult.suggestedAction].label}
                </Badge>
                <span className="text-xs text-muted-foreground">suggested</span>
              </div>

              {/* 8.1 Duplicate warning */}
              {similarNotes.length > 0 && (
                <div
                  style={{
                    background: "color-mix(in srgb, var(--amber) 10%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--amber) 30%, transparent)",
                    borderRadius: "var(--radius)",
                    padding: "8px 10px",
                  }}
                  role="alert"
                >
                  <div className="flex items-center gap-1.5 mb-1.5" style={{ color: "var(--amber)" }}>
                    <span aria-hidden="true">⚠</span>
                    <span className="text-xs font-medium">Similar notes found:</span>
                  </div>
                  <ul className="flex flex-col gap-0.5">
                    {similarNotes.map((note) => (
                      <li key={note.path}>
                        <a
                          href={`obsidian://open?vault=Bf-vault&file=${encodeURIComponent(note.path)}`}
                          style={{
                            color: "var(--accent)",
                            fontSize: "11px",
                            fontFamily: "var(--font-mono, monospace)",
                          }}
                          title={note.path}
                        >
                          {note.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Confidence bar */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Confidence</span>
                  <span className="text-xs text-muted-foreground font-mono">{pct}%</span>
                </div>
                <div
                  className="w-full h-1.5 bg-muted rounded overflow-hidden"
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Confidence: ${pct}%`}
                >
                  <div
                    className={`h-full rounded transition-all ${confidenceColor(classifyResult.confidence)}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              {/* Reasoning */}
              <p className="text-xs text-muted-foreground italic">{classifyResult.reasoning}</p>

              {/* Destination */}
              {classifyResult.destinationPath && (
                <div className="flex items-center gap-1.5">
                  <FolderOpen size={12} className="text-muted-foreground shrink-0" aria-hidden="true" />
                  <span className="font-mono text-xs text-muted-foreground truncate" title={classifyResult.destinationPath}>
                    {classifyResult.destinationPath}
                  </span>
                </div>
              )}

              <Separator />

              {/* ── Confirmation step ──────────────────────────────────── */}
              {pendingAction ? (
                <div className="flex flex-col gap-3">
                  <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {diffDescription(pendingAction, classifyResult, selectedItem)}
                  </div>

                  {pendingAction === "delete" && (
                    <div className="flex items-center gap-1.5 text-[10px] text-[var(--amber)]">
                      <AlertTriangle size={10} aria-hidden="true" />
                      <span>File will be backed up — undo available for 5 min</span>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className={[
                        "flex-1 text-xs",
                        pendingAction === "delete"
                          ? "bg-[var(--red)] text-white hover:bg-[var(--red)]/90"
                          : "bg-accent text-accent-foreground hover:bg-accent/90",
                      ].join(" ")}
                      disabled={isWriting}
                      onClick={() => void handleConfirm()}
                      aria-label={`Confirm: ${ACTION_META[pendingAction].label}`}
                    >
                      {isWriting ? (
                        <Loader2 size={12} className="animate-spin mr-1" />
                      ) : null}
                      Confirm
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs"
                      disabled={isWriting}
                      onClick={() => setPendingAction(null)}
                      aria-label="Cancel"
                    >
                      <X size={12} aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              ) : (
                /* ── Action buttons ──────────────────────────────────── */
                <div className="flex flex-col gap-1.5">
                  {/* Suggested action — primary */}
                  <ActionButton
                    action={classifyResult.suggestedAction}
                    primary
                    onClick={() => setPendingAction(classifyResult.suggestedAction)}
                  />

                  {/* Other actions */}
                  <div className="grid grid-cols-2 gap-1.5 mt-0.5">
                    {(Object.keys(ACTION_META) as WriteAction[])
                      .filter((a) => a !== classifyResult.suggestedAction)
                      .map((action) => (
                        <ActionButton
                          key={action}
                          action={action}
                          onClick={() => setPendingAction(action)}
                        />
                      ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

function PanelHeader(): React.ReactElement {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
      <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
        AI Context
      </span>
      <Sparkles className="text-accent" size={14} aria-hidden="true" />
    </div>
  )
}

function ActionButton({
  action,
  primary = false,
  onClick,
}: {
  action: WriteAction
  primary?: boolean
  onClick: () => void
}): React.ReactElement {
  const { label, icon: Icon, danger } = ACTION_META[action]

  if (primary) {
    return (
      <Button
        size="sm"
        className="w-full text-xs bg-accent text-accent-foreground hover:bg-accent/90"
        onClick={onClick}
        aria-label={label}
      >
        <Icon size={12} className="mr-1.5" aria-hidden="true" />
        {label}
      </Button>
    )
  }

  return (
    <Button
      size="sm"
      variant="outline"
      className={[
        "text-xs justify-start gap-1.5",
        danger ? "hover:border-[var(--red)] hover:text-[var(--red)]" : "",
      ].join(" ")}
      onClick={onClick}
      aria-label={label}
    >
      <Icon size={11} aria-hidden="true" />
      <span className="truncate">{label}</span>
    </Button>
  )
}
