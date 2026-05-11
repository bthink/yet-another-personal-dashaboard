"use client";

import { useState, useEffect, useRef, useCallback, type ComponentType } from "react";
import {
  Search,
  Inbox,
  CheckSquare,
  BookOpen,
  FolderKanban,
  FlaskConical,
  Calendar,
  Settings,
  Plus,
  FilePlus,
} from "lucide-react";
import { mockInboxItems } from "@/lib/mock-data";

interface CommandItem {
  id: string;
  label: string;
  group: "navigation" | "actions" | "recent";
  icon: ComponentType<{ className?: string }>;
  shortcut?: string;
}

const ALL_COMMANDS: CommandItem[] = [
  { id: "nav-inbox", label: "Go to Inbox", group: "navigation", icon: Inbox, shortcut: "G I" },
  { id: "nav-todo", label: "Go to TODO", group: "navigation", icon: CheckSquare, shortcut: "G T" },
  { id: "nav-knowledge", label: "Go to Knowledge", group: "navigation", icon: BookOpen },
  { id: "nav-projects", label: "Go to Projects", group: "navigation", icon: FolderKanban },
  { id: "nav-research", label: "Go to Research", group: "navigation", icon: FlaskConical },
  { id: "nav-calendar", label: "Go to Calendar", group: "navigation", icon: Calendar },
  { id: "nav-settings", label: "Go to Settings", group: "navigation", icon: Settings, shortcut: "G S" },
  { id: "action-capture", label: "Quick capture", group: "actions", icon: Plus, shortcut: "⌘K" },
  { id: "action-new-note", label: "New note", group: "actions", icon: FilePlus },
  { id: "action-search", label: "Search vault", group: "actions", icon: Search, shortcut: "⌘F" },
  ...mockInboxItems.slice(0, 3).map((item) => ({
    id: `recent-${item.id}`,
    label: item.title,
    group: "recent" as const,
    icon: Search,
  })),
];

const GROUP_LABELS: Record<CommandItem["group"], string> = {
  navigation: "Navigation",
  actions: "Actions",
  recent: "Recent",
};

const GROUP_ORDER: CommandItem["group"][] = ["navigation", "actions", "recent"];

interface Props {
  onClose: () => void;
}

export default function CommandPalette({ onClose }: Props) {
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = query.trim()
    ? ALL_COMMANDS.filter((cmd) =>
        cmd.label.toLowerCase().includes(query.toLowerCase())
      )
    : ALL_COMMANDS;

  // Reset highlight when filtered list changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [query]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex((i) => Math.min(i + 1, filtered.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const item = filtered[highlightedIndex];
        if (item) {
          console.log("Command activated:", item.id, item.label);
          onClose();
        }
        return;
      }
    },
    [filtered, highlightedIndex, onClose]
  );

  // Scroll highlighted item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${highlightedIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [highlightedIndex]);

  // Build grouped structure for rendering
  const groups = GROUP_ORDER.reduce<{ group: CommandItem["group"]; items: CommandItem[] }[]>(
    (acc, group) => {
      const items = filtered.filter((cmd) => cmd.group === group);
      if (items.length > 0) acc.push({ group, items });
      return acc;
    },
    []
  );

  return (
    // Overlay
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/50 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-modal="true"
      role="dialog"
      aria-label="Command palette"
    >
      {/* Dialog box */}
      <div
        className="w-full max-w-lg mx-4 bg-background rounded-lg shadow-xl border border-border overflow-hidden"
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center h-11 border-b border-border px-4 gap-3">
          <Search className="size-4 text-muted-foreground shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            aria-label="Command search"
            aria-autocomplete="list"
            aria-controls="command-list"
            aria-activedescendant={filtered[highlightedIndex] ? `cmd-${filtered[highlightedIndex].id}` : undefined}
          />
        </div>

        {/* Results */}
        <div
          ref={listRef}
          id="command-list"
          role="listbox"
          className="max-h-80 overflow-y-auto py-1"
        >
          {groups.length === 0 ? (
            <div className="flex items-center justify-center h-16 text-sm text-muted-foreground">
              No results found
            </div>
          ) : (
            groups.map(({ group, items }) => {
              // Compute the absolute index of the first item in this group
              const groupStartIndex = filtered.indexOf(items[0]);
              return (
                <div key={group}>
                  <div className="px-2 py-1 text-xs uppercase tracking-wider text-muted-foreground font-medium">
                    {GROUP_LABELS[group]}
                  </div>
                  {items.map((cmd, localIdx) => {
                    const absoluteIndex = groupStartIndex + localIdx;
                    const isHighlighted = absoluteIndex === highlightedIndex;
                    const Icon = cmd.icon;
                    return (
                      <div
                        key={cmd.id}
                        id={`cmd-${cmd.id}`}
                        data-index={absoluteIndex}
                        role="option"
                        aria-selected={isHighlighted}
                        className={[
                          "flex items-center gap-3 px-4 py-2 cursor-pointer select-none text-sm transition-colors",
                          isHighlighted ? "bg-accent/10 text-foreground" : "text-foreground hover:bg-muted/50",
                        ].join(" ")}
                        onMouseEnter={() => setHighlightedIndex(absoluteIndex)}
                        onClick={() => {
                          console.log("Command activated:", cmd.id, cmd.label);
                          onClose();
                        }}
                      >
                        <Icon className="size-4 text-muted-foreground shrink-0" />
                        <span className="flex-1">{cmd.label}</span>
                        {cmd.shortcut && (
                          <kbd className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border">
                            {cmd.shortcut}
                          </kbd>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
