'use client'

import { useState } from "react"
import useSWR from "swr"
import { Check, Plus, Calendar, X } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { TodoItem, TodoSection, TodoPriority } from "@/lib/mock-data"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function getPriorityDotClass(priority: TodoPriority): string {
  if (priority === "high") return "bg-destructive"
  if (priority === "medium") return "bg-amber-400"
  return "bg-muted-foreground/30"
}

function isOverdue(dueDate: string): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  return due <= today
}

function isStale(dueDate: string, done: boolean): boolean {
  if (done) return false
  const diff = Date.now() - new Date(dueDate).getTime()
  return diff > 14 * 24 * 60 * 60 * 1000
}

function formatDueDate(dueDate: string): string {
  const date = new Date(dueDate)
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
}

function renderTitleWithWikilinks(title: string): React.ReactNode {
  const parts = title.split(/(\[\[.*?\]\])/g)
  return parts.map((part, i) => {
    if (part.startsWith("[[") && part.endsWith("]]")) {
      return (
        <span key={i} className="font-mono text-accent text-[0.8em]">
          {part}
        </span>
      )
    }
    return part
  })
}

interface TodoItemRowProps {
  item: TodoItem
  done: boolean
  stale: boolean
  onToggle: (id: string) => void
}

function TodoItemRow({ item, done, stale, onToggle }: TodoItemRowProps): React.ReactElement {
  return (
    <div
      className="px-3 py-1.5 flex items-start gap-2"
      style={stale ? { background: "color-mix(in srgb, var(--amber) 6%, transparent)" } : undefined}
    >
      {/* Circular checkbox */}
      <button
        type="button"
        aria-label={done ? "Mark as not done" : "Mark as done"}
        className="mt-0.5 shrink-0 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full"
        onClick={() => onToggle(item.id)}
      >
        {done ? (
          <span className="w-4 h-4 rounded-full bg-accent flex items-center justify-center">
            <Check className="text-white w-2.5 h-2.5" strokeWidth={3} />
          </span>
        ) : (
          <span className="w-4 h-4 rounded-full border border-muted-foreground/40" />
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-1.5">
          {/* Priority dot */}
          <span
            className={`mt-[5px] shrink-0 w-1.5 h-1.5 rounded-full ${getPriorityDotClass(item.priority)}`}
          />
          {/* Title */}
          <span
            className={`text-sm leading-snug ${done ? "line-through text-muted-foreground" : ""}`}
          >
            {renderTitleWithWikilinks(item.title)}
          </span>
        </div>

        {/* Due date */}
        {item.dueDate && (
          <div className="flex items-center gap-1.5 mt-0.5">
            <div
              className={stale ? "" : isOverdue(item.dueDate) ? "text-destructive" : "text-muted-foreground"}
              style={stale ? { color: "var(--amber)" } : undefined}
            >
              <span className="flex items-center gap-1">
                <Calendar className="w-2.5 h-2.5" />
                <span className="text-xs">{formatDueDate(item.dueDate)}</span>
              </span>
            </div>
            {stale && (
              <span
                style={{
                  fontSize: "9px",
                  color: "var(--amber)",
                  border: "1px solid color-mix(in srgb, var(--amber) 40%, transparent)",
                  borderRadius: "3px",
                  padding: "0px 4px",
                  fontFamily: "var(--font-mono, monospace)",
                  lineHeight: "1.5",
                }}
              >
                stale
              </span>
            )}
          </div>
        )}

        {/* Tags + project */}
        {(item.tags || item.project) && (
          <div className="flex flex-wrap items-center gap-1 mt-0.5">
            {item.tags?.map((tag) => (
              <span
                key={tag}
                className="font-mono text-[10px] bg-muted rounded px-1 text-muted-foreground"
              >
                {tag}
              </span>
            ))}
            {item.project && (
              <span className="font-mono text-accent/70 text-xs">[[{item.project}]]</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function TodoPanel(): React.ReactElement {
  const { data: todoSections = [], isLoading } = useSWR<TodoSection[]>(
    "/api/vault/todo",
    fetcher,
    { refreshInterval: 30_000 },
  )

  const [doneTodos, setDoneTodos] = useState<Set<string>>(new Set<string>())
  const [staleBannerDismissed, setStaleBannerDismissed] = useState(false)

  const totalItems = todoSections.reduce((sum, s) => sum + s.items.length, 0)

  function toggleDone(id: string): void {
    setDoneTodos((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function getEffectiveDone(item: TodoItem): boolean {
    return item.done !== doneTodos.has(item.id)
  }

  const totalStaleCount = todoSections.reduce((sum, section) =>
    sum + section.items.filter((item) =>
      item.dueDate != null && isStale(item.dueDate, getEffectiveDone(item))
    ).length,
    0,
  )

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-accent uppercase tracking-wide">TODO</span>
          <Badge variant="secondary" className="text-xs px-1.5 py-0">
            {isLoading ? "…" : totalItems}
          </Badge>
        </div>
        <Button variant="ghost" size="sm" className="h-6 px-1.5 text-muted-foreground" disabled>
          <Plus className="w-3.5 h-3.5" />
          <span className="sr-only">Add item</span>
        </Button>
      </div>

      {/* Stale summary banner */}
      {totalStaleCount > 0 && !staleBannerDismissed && (
        <div
          className="flex items-center justify-between shrink-0"
          style={{
            background: "color-mix(in srgb, var(--amber) 8%, transparent)",
            borderBottom: "1px solid color-mix(in srgb, var(--amber) 25%, transparent)",
            padding: "6px 12px",
          }}
        >
          <span
            style={{ color: "var(--amber)", fontSize: "11px" }}
          >
            ⚠ {totalStaleCount} stale task{totalStaleCount === 1 ? "" : "s"} — overdue by 14+ days
          </span>
          <button
            type="button"
            aria-label="Dismiss stale tasks banner"
            onClick={() => setStaleBannerDismissed(true)}
            style={{ color: "var(--amber)", lineHeight: 1 }}
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Scrollable sections */}
      <ScrollArea className="flex-1">
        {todoSections.map((section, sectionIndex) => {
          const sectionStaleCount = section.items.filter((item) =>
            item.dueDate != null && isStale(item.dueDate, getEffectiveDone(item))
          ).length

          return (
            <div key={section.id}>
              {/* Section heading */}
              <div className="sticky top-0 z-10 bg-background px-3 py-1.5 flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {section.title}
                </span>
                <span className="text-xs text-muted-foreground">{section.items.length}</span>
                {sectionStaleCount > 0 && (
                  <span
                    className="flex items-center gap-0.5"
                    style={{ color: "var(--amber)", fontSize: "10px" }}
                  >
                    ⚠ {sectionStaleCount} stale
                  </span>
                )}
              </div>

              {/* Items */}
              {section.items.map((item) => {
                const effectiveDone = getEffectiveDone(item)
                const stale = item.dueDate != null && isStale(item.dueDate, effectiveDone)
                return (
                  <TodoItemRow
                    key={item.id}
                    item={item}
                    done={effectiveDone}
                    stale={stale}
                    onToggle={toggleDone}
                  />
                )
              })}

              {/* Separator between sections */}
              {sectionIndex < todoSections.length - 1 && (
                <Separator className="my-1" />
              )}
            </div>
          )
        })}
      </ScrollArea>
    </div>
  )
}
