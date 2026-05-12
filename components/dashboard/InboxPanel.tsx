'use client'

import { useState } from "react"
import useSWR from "swr"
import { FileText, Link2, CheckSquare, Lightbulb, File, ExternalLink } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import type { InboxItem, InboxItemType, InboxItemStatus } from "@/lib/mock-data"
import { buildObsidianUrl } from "@/lib/obsidian"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

type FilterTab = "all" | InboxItemStatus

function formatRelativeTime(isoString: string): string {
  const now = new Date()
  const date = new Date(isoString)
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMinutes < 60) return `${diffMinutes}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

const TYPE_ICONS: Record<InboxItemType, React.ElementType> = {
  note: FileText,
  link: Link2,
  task: CheckSquare,
  idea: Lightbulb,
  file: File,
}

function StatusDot({ status }: { status: InboxItemStatus }): React.ReactElement {
  const colorClass =
    status === "new"
      ? "bg-accent"
      : status === "snoozed"
        ? "bg-snoozed"
        : "bg-muted-foreground/40"

  return <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${colorClass}`} />
}

interface InboxItemRowProps {
  item: InboxItem
  selected: boolean
  vaultName: string | undefined
  onSelect: (id: string) => void
}

function InboxItemRow({ item, selected, vaultName, onSelect }: InboxItemRowProps): React.ReactElement {
  const Icon = TYPE_ICONS[item.type]

  return (
    <div
      className={[
        "border-b border-border last:border-b-0",
        selected ? "border-l-2 border-l-accent bg-accent/5" : "border-l-2 border-l-transparent",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={() => onSelect(item.id)}
        className="w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Icon size={14} className="flex-shrink-0 text-muted-foreground" aria-hidden="true" />
          <StatusDot status={item.status} />
          <span className="flex-1 text-sm font-medium truncate">{item.title}</span>
          <span className="flex-shrink-0 text-xs text-muted-foreground font-mono">
            {formatRelativeTime(item.timestamp)}
          </span>
        </div>

        {(item.preview || item.source) && (
          <div className="flex items-center gap-2 mt-0.5 pl-6">
            {item.preview && (
              <span className="flex-1 text-xs text-muted-foreground truncate">{item.preview}</span>
            )}
            {item.source && (
              <Badge
                variant="secondary"
                className="flex-shrink-0 text-[10px] px-1 py-0 h-auto font-mono leading-4"
              >
                {item.source}
              </Badge>
            )}
          </div>
        )}
      </button>

      {selected && vaultName && (
        <div className="px-3 pb-2 pl-[34px]">
          <a
            href={buildObsidianUrl(vaultName, `97_Inbox/${item.id}`)}
            className="inline-flex items-center gap-1 text-[10px] text-accent hover:underline font-mono"
            aria-label={`Open ${item.title} in Obsidian`}
          >
            <ExternalLink size={10} aria-hidden="true" />
            Open in Obsidian
          </a>
        </div>
      )}
    </div>
  )
}

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "new", label: "New" },
  { key: "triaged", label: "Triaged" },
  { key: "snoozed", label: "Snoozed" },
]

export default function InboxPanel(): React.ReactElement {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all")

  const { data: inboxItems = [], isLoading } = useSWR<InboxItem[]>(
    "/api/vault/inbox",
    fetcher,
    { refreshInterval: 30_000 },
  )

  const { data: healthData } = useSWR<{ ok: boolean; vaultName: string }>(
    "/api/vault/health",
    fetcher,
  )

  const filteredItems =
    activeFilter === "all"
      ? inboxItems
      : inboxItems.filter((item) => item.status === activeFilter)

  function getTabCount(key: FilterTab): number {
    if (key === "all") return inboxItems.length
    return inboxItems.filter((item) => item.status === key).length
  }

  function handleSelect(id: string): void {
    setSelectedId((prev) => (prev === id ? null : id))
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border px-3 pt-3 pb-0">
        <div className="flex items-center gap-2 mb-2">
          <h2 className="text-sm font-semibold">Inbox</h2>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-auto font-mono">
            {isLoading ? "…" : inboxItems.length}
          </Badge>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-4" role="tablist" aria-label="Filter inbox items">
          {FILTER_TABS.map(({ key, label }) => {
            const isActive = activeFilter === key
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveFilter(key)}
                className={[
                  "text-sm pb-2 border-b-2 transition-colors",
                  isActive
                    ? "text-accent border-accent"
                    : "text-muted-foreground border-transparent hover:text-foreground",
                ].join(" ")}
              >
                {label}
                <span className="ml-1 text-xs opacity-70">{getTabCount(key)}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Item list */}
      <ScrollArea className="flex-1">
        <div role="tabpanel">
          {filteredItems.length === 0 ? (
            <p className="text-xs text-muted-foreground px-3 py-4">No items.</p>
          ) : (
            filteredItems.map((item) => (
              <InboxItemRow
                key={item.id}
                item={item}
                selected={selectedId === item.id}
                vaultName={healthData?.vaultName}
                onSelect={handleSelect}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
