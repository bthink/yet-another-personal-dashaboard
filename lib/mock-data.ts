// Mock data for Phase 1 dashboard - will be replaced by real vault data in Phase 2

export type InboxItemType = "note" | "link" | "task" | "idea" | "file"
export type InboxItemStatus = "new" | "triaged" | "snoozed"

export interface InboxItem {
  id: string
  title: string
  type: InboxItemType
  status: InboxItemStatus
  timestamp: string // ISO string
  source?: string
  preview?: string
}

export type TodoPriority = "high" | "medium" | "low"

export interface TodoItem {
  id: string
  title: string
  done: boolean
  priority: TodoPriority
  dueDate?: string // ISO string
  project?: string // wikilink target e.g. "Website redesign"
  tags?: string[]
}

export interface TodoSection {
  id: string
  title: string
  items: TodoItem[]
}

export interface AiSuggestion {
  id: string
  inboxItemId: string
  suggestedAction: "add-to-todo" | "create-note" | "move-to-ideas" | "watchlist" | "keep" | "delete"
  confidence: number // 0-1
  reasoning: string
  destinationPath?: string // vault path
}

export const mockInboxItems: InboxItem[] = [
  {
    id: "inbox-1",
    title: "Found interesting article on RAG architectures",
    type: "link",
    status: "new",
    timestamp: "2026-05-11T08:23:00Z",
    source: "Web clip",
    preview: "Survey of retrieval-augmented generation patterns for production LLM apps...",
  },
  {
    id: "inbox-2",
    title: "Meeting notes from Monday standup",
    type: "note",
    status: "new",
    timestamp: "2026-05-11T09:05:00Z",
    source: "Mobile capture",
    preview: "Discussed dashboard timeline, agreed on Phase 1 deadline end of week.",
  },
  {
    id: "inbox-3",
    title: "Buy groceries - to process",
    type: "task",
    status: "new",
    timestamp: "2026-05-10T19:44:00Z",
    source: "Mobile capture",
  },
  {
    id: "inbox-4",
    title: "Idea: dashboard widget for habits",
    type: "idea",
    status: "new",
    timestamp: "2026-05-10T15:30:00Z",
    source: "Mobile capture",
    preview: "A streaks-style widget showing daily habits with a heatmap view.",
  },
  {
    id: "inbox-5",
    title: "Obsidian Templater cheatsheet.pdf",
    type: "file",
    status: "triaged",
    timestamp: "2026-05-09T12:00:00Z",
    source: "File drop",
  },
  {
    id: "inbox-6",
    title: "Book recommendation: Four Thousand Weeks",
    type: "link",
    status: "snoozed",
    timestamp: "2026-05-09T08:10:00Z",
    source: "Web clip",
    preview: "Oliver Burkeman on finite time and how to stop optimizing your life.",
  },
  {
    id: "inbox-7",
    title: "Follow up with Marta about design review",
    type: "task",
    status: "new",
    timestamp: "2026-05-11T07:00:00Z",
    source: "Mobile capture",
  },
  {
    id: "inbox-8",
    title: "Draft outline for Q3 project proposal",
    type: "note",
    status: "triaged",
    timestamp: "2026-05-08T16:20:00Z",
    source: "Desktop capture",
    preview: "Goals: reduce onboarding time by 30%, integrate new analytics pipeline.",
  },
]

export const mockTodoSections: TodoSection[] = [
  {
    id: "section-today",
    title: "Today",
    items: [
      {
        id: "todo-1",
        title: "Finish Phase 1 dashboard shell",
        done: false,
        priority: "high",
        project: "Personal Dashboard",
        tags: ["#dev", "#urgent"],
      },
      {
        id: "todo-2",
        title: "Review PR for landing page redesign",
        done: false,
        priority: "medium",
        project: "Website redesign",
        tags: ["#design"],
      },
      {
        id: "todo-3",
        title: "Reply to Marta about design review",
        done: true,
        priority: "medium",
        tags: ["#comms"],
      },
    ],
  },
  {
    id: "section-week",
    title: "This week",
    items: [
      {
        id: "todo-4",
        title: "Write unit tests for InboxPanel",
        done: false,
        priority: "medium",
        dueDate: "2026-05-13T00:00:00Z",
        project: "Personal Dashboard",
        tags: ["#dev"],
      },
      {
        id: "todo-5",
        title: "Prepare Q3 proposal outline",
        done: false,
        priority: "high",
        dueDate: "2026-05-14T00:00:00Z",
        tags: ["#work"],
      },
      {
        id: "todo-6",
        title: "Read Four Thousand Weeks chapter 3",
        done: false,
        priority: "low",
        dueDate: "2026-05-15T00:00:00Z",
        tags: ["#reading"],
      },
      {
        id: "todo-7",
        title: "Set up Obsidian Templater for daily notes",
        done: false,
        priority: "medium",
        dueDate: "2026-05-16T00:00:00Z",
        project: "Vault setup",
        tags: ["#obsidian"],
      },
    ],
  },
  {
    id: "section-someday",
    title: "Someday",
    items: [
      {
        id: "todo-8",
        title: "Explore Rust for CLI tooling",
        done: false,
        priority: "low",
        tags: ["#learning", "#dev"],
      },
      {
        id: "todo-9",
        title: "Redesign personal site portfolio section",
        done: false,
        priority: "low",
        project: "Website redesign",
        tags: ["#design"],
      },
    ],
  },
]

export const mockAiSuggestion: AiSuggestion = {
  id: "suggestion-1",
  inboxItemId: "inbox-1",
  suggestedAction: "create-note",
  confidence: 0.87,
  reasoning:
    "This article is closely related to your existing notes on LLM architecture. Creating a note in 02_Areas/AI-Research would maintain the connection.",
  destinationPath: "02_Areas/AI-Research/RAG-patterns",
}
