"use client";

import { Search, RefreshCw, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const MODES = ["Search", "Ask", "Capture", "Research"] as const;
type Mode = (typeof MODES)[number];

const ACTIVE_MODE: Mode = "Search";

export default function Topbar() {
  return (
    <TooltipProvider>
      <header
        className="h-12 w-full shrink-0 border-b border-border flex items-center gap-4 px-4"
        aria-label="Top navigation bar"
      >
        {/* Search / Command bar */}
        <div className="relative flex items-center w-80 shrink-0">
          <Search
            className="absolute left-2 size-4 text-muted-foreground pointer-events-none"
            aria-hidden="true"
          />
          <div
            role="button"
            tabIndex={0}
            aria-label="Search or open command palette"
            className="flex h-8 w-full items-center rounded-md border border-input bg-muted/50 pl-8 pr-3 text-sm text-muted-foreground cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Search or press ⌘K...
          </div>
        </div>

        {/* Mode selector */}
        <nav
          aria-label="View mode selector"
          className="flex items-center gap-0.5 rounded-md border border-border p-0.5"
        >
          {MODES.map((mode) => {
            const isActive = mode === ACTIVE_MODE;
            return (
              <Button
                key={mode}
                variant={isActive ? "default" : "ghost"}
                size="sm"
                className={
                  isActive
                    ? "h-7 px-3 text-xs bg-accent text-accent-foreground hover:bg-accent/90"
                    : "h-7 px-3 text-xs"
                }
                aria-label={`${mode} mode`}
              >
                {mode}
              </Button>
            );
          })}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right side cluster */}
        <div className="flex items-center gap-3">
          {/* Sync status */}
          <div className="flex items-center gap-1.5 text-xs text-success">
            <RefreshCw className="size-3.5" aria-hidden="true" />
            <span>Synced</span>
          </div>

          {/* AI status */}
          <div
            className="flex items-center gap-1.5 text-xs text-muted-foreground"
            aria-label="AI status: online"
          >
            <span
              className="size-2 rounded-full bg-success"
              aria-hidden="true"
            />
            <span>AI ready</span>
          </div>

          <Separator orientation="vertical" className="h-5" />

          {/* Settings button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="Open settings"
              >
                <Settings className="size-4" aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Settings</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </header>
    </TooltipProvider>
  );
}
