"use client";

import { Search, RefreshCw, Settings, Menu, AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import ThemeToggle from "@/components/layout/ThemeToggle";
import { useMobileNav } from "@/components/layout/MobileNavProvider";
import useSWR from "swr";
import { useState, useRef, useEffect, useCallback } from "react";
import type { SearchResult } from "@/lib/search";
import { buildObsidianUrl } from "@/lib/obsidian";

const MODES = ["Search", "Ask", "Capture", "Research"] as const;
type Mode = (typeof MODES)[number];

const ACTIVE_MODE: Mode = "Search";

type HealthResponse = { ok: boolean; vaultName: string; inboxCount: number } | { ok: false; error: string };

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function Topbar() {
  const { toggleSidebar } = useMobileNav();

  const { data: health, isLoading } = useSWR<HealthResponse>("/api/vault/health", fetcher, {
    revalidateOnFocus: true,
    refreshInterval: 30000,
  });

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.length < 2) {
      setResults([]);
      setIsSearchOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/vault/search?q=${encodeURIComponent(value)}`);
        const data: SearchResult[] = await res.json();
        setResults(data);
        setIsSearchOpen(data.length > 0);
      } catch {
        setResults([]);
        setIsSearchOpen(false);
      }
    }, 250);
  }, []);

  const handleResultClick = useCallback((result: SearchResult) => {
    const vaultName = health?.ok ? (health as { ok: true; vaultName: string }).vaultName : "Bf-vault";
    window.location.href = buildObsidianUrl(vaultName, result.path);
    setIsSearchOpen(false);
    setQuery("");
    setResults([]);
  }, [health]);

  const closeDropdown = useCallback(() => {
    setIsSearchOpen(false);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        closeDropdown();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [closeDropdown]);

  const vaultOk = !isLoading && health?.ok === true;
  const vaultError = !isLoading && (!health || health.ok === false);

  return (
    <TooltipProvider>
      <header
        className="h-12 w-full shrink-0 border-b border-border flex items-center gap-4 px-4"
        aria-label="Top navigation bar"
      >
        {/* Hamburger - mobile only */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 lg:hidden shrink-0"
          aria-label="Open navigation menu"
          onClick={toggleSidebar}
        >
          <Menu className="size-4" aria-hidden="true" />
        </Button>

        {/* Search / Command bar */}
        <div ref={searchContainerRef} className="relative flex items-center w-80 shrink-0">
          <Search
            className="absolute left-2 size-4 text-muted-foreground pointer-events-none"
            aria-hidden="true"
          />
          <input
            role="combobox"
            aria-expanded={isSearchOpen}
            aria-label="Search vault"
            aria-autocomplete="list"
            type="text"
            value={query}
            placeholder="Search or press ⌘K..."
            onChange={(e) => handleQueryChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") closeDropdown();
            }}
            className="flex h-8 w-full items-center rounded-md border border-input bg-muted/50 pl-8 pr-3 text-sm text-muted-foreground cursor-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {isSearchOpen && results.length > 0 && (
            <div
              role="listbox"
              aria-label="Search results"
              style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                left: 0,
                right: 0,
                background: "var(--panel)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)",
                boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                zIndex: 50,
                overflow: "hidden",
              }}
            >
              {results.slice(0, 6).map((result) => (
                <button
                  key={result.path}
                  role="option"
                  aria-selected={false}
                  onClick={() => handleResultClick(result)}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "8px 10px",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    borderBottom: "1px solid var(--border)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "var(--panel-2)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      marginBottom: "2px",
                    }}
                  >
                    <span
                      className="text-sm font-medium"
                      style={{ color: "var(--text)", flexShrink: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    >
                      {result.title}
                    </span>
                    <span
                      style={{
                        fontSize: "10px",
                        fontFamily: "var(--font-mono, monospace)",
                        color: "var(--text-3)",
                        background: "var(--panel-2)",
                        border: "1px solid var(--border)",
                        borderRadius: "3px",
                        padding: "0 4px",
                        flexShrink: 0,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {result.folder}
                    </span>
                  </div>
                  <div
                    className="text-xs"
                    style={{
                      color: "var(--text-3)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {result.snippet}
                  </div>
                </button>
              ))}
            </div>
          )}
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
          {isLoading ? (
            <div
              className="flex items-center gap-1.5 text-xs"
              style={{ color: "var(--text-3)" }}
              aria-label="Checking vault status"
            >
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              <span>Checking...</span>
            </div>
          ) : vaultOk ? (
            <div
              className="flex items-center gap-1.5 text-xs"
              style={{ color: "var(--green)" }}
              aria-label="Vault synced"
            >
              <RefreshCw className="size-3.5" aria-hidden="true" />
              <span>Synced</span>
            </div>
          ) : (
            <div
              className="flex items-center gap-1.5 text-xs"
              style={{ color: "var(--red)" }}
              aria-label="Vault error"
            >
              <AlertCircle className="size-3.5" aria-hidden="true" />
              <span>Vault error</span>
            </div>
          )}

          {/* AI status */}
          <div
            className="flex items-center gap-1.5 text-xs text-muted-foreground"
            aria-label={`AI status: ${vaultOk ? "online" : "unknown"}`}
          >
            <span
              className="size-2 rounded-full shrink-0"
              style={{ background: vaultError ? "var(--red)" : "var(--green)" }}
              aria-hidden="true"
            />
            <span>AI ready</span>
          </div>

          <Separator orientation="vertical" className="h-5" />

          {/* Theme toggle */}
          <ThemeToggle />

          {/* Settings button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="Open settings"
                asChild
              >
                <Link href="/dashboard/settings">
                  <Settings className="size-4" aria-hidden="true" />
                </Link>
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
