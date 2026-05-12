'use client'

import { useState } from "react"
import useSWR from "swr"
import { Check, Plus, Calendar } from "lucide-react"
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
  onToggle: (id: string) => void
}

function TodoItemRow({ item, done, onToggle }: TodoItemRowProps): React.ReactElement {
  return (
    <div className="px-3 py-1.5 flex items-start gap-2">
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
          <div
            className={`flex items-center gap-1 mt-0.5 ${
              isOverdue(item.dueDate) ? "text-destructive" : "text-muted-foreground"
            }`}
          >
            <Calendar className="w-2.5 h-2.5" />
            <span className="text-xs">{formatDueDate(item.dueDate)}</span>
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

      {/* Scrollable sections */}
      <ScrollArea className="flex-1">
        {todoSections.map((section, sectionIndex) => (
          <div key={section.id}>
            {/* Section heading */}
            <div className="sticky top-0 z-10 bg-background px-3 py-1.5 flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {section.title}
              </span>
              <span className="text-xs text-muted-foreground">{section.items.length}</span>
            </div>

            {/* Items */}
            {section.items.map((item) => (
              <TodoItemRow
                key={item.id}
                item={item}
                done={doneTodos.has(item.id)}
                onToggle={toggleDone}
              />
            ))}

            {/* Separator between sections */}
            {sectionIndex < todoSections.length - 1 && (
              <Separator className="my-1" />
            )}
          </div>
        ))}
      </ScrollArea>
    </div>
  )
}
