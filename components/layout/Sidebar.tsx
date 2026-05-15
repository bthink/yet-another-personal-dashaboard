import type { ComponentType } from "react";
import {
  LayoutDashboard,
  Inbox,
  CheckSquare,
  BookOpen,
  FolderKanban,
  FlaskConical,
  Zap,
  Calendar,
  Settings,
  Plus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

interface NavItem {
  icon: ComponentType<{ size?: number; className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
  label: string;
  active?: boolean;
  badge?: string;
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: Inbox, label: "Inbox", badge: "12" },
  { icon: CheckSquare, label: "TODO" },
  { icon: BookOpen, label: "Knowledge" },
  { icon: FolderKanban, label: "Projects" },
  { icon: FlaskConical, label: "Research" },
  { icon: Zap, label: "Automations" },
  { icon: Calendar, label: "Calendar" },
  { icon: Settings, label: "Settings" },
];

const activeProjects = [
  "Website redesign",
  "Q2 Planning",
  "Research notes",
] as const;

export default function Sidebar() {
  return (
    <aside
      className="w-60 shrink-0 h-full border-r border-border flex flex-col"
      aria-label="Sidebar navigation"
    >
      {/* Vault Info */}
      <div className="px-4 py-3 shrink-0">
        <p className="font-bold text-sm leading-tight">Bf-vault</p>
        <p className="text-xs text-muted-foreground mt-0.5">PARA structure</p>
      </div>
      <Separator />

      {/* Scrollable nav + active projects */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="px-2 py-2">
          <nav aria-label="Main navigation" className="flex flex-col gap-0.5">
            {navItems.map((item) => {
              const { icon: Icon, label, active, badge } = item;
              return (
                <Button
                  key={label}
                  variant="ghost"
                  className={[
                    "w-full justify-start h-8 px-2 text-sm font-normal",
                    active
                      ? "bg-accent/10 text-accent hover:bg-accent/15 hover:text-accent"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon size={16} className="mr-2 shrink-0" aria-hidden={true} />
                  <span className="flex-1 text-left">{label}</span>
                  {badge && (
                    <Badge
                      variant="secondary"
                      className="ml-auto h-4 px-1.5 text-[10px] leading-none"
                    >
                      {badge}
                    </Badge>
                  )}
                </Button>
              );
            })}
          </nav>

          {/* Active Projects */}
          <div className="mt-4 px-2">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
              Active Projects
            </p>
            <ul className="flex flex-col gap-0.5">
              {activeProjects.map((project) => (
                <li key={project}>
                  <button
                    type="button"
                    className="w-full text-left flex items-center gap-2 px-1 py-1 text-xs rounded-sm hover:bg-muted truncate transition-colors"
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-accent shrink-0"
                      aria-hidden="true"
                    />
                    <span className="truncate">{project}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </ScrollArea>

      {/* Capture Button */}
      <div className="px-3 py-3 shrink-0">
        <Separator className="mb-3" />
        <Button
          className="w-full bg-accent hover:bg-accent/90 text-white h-8 text-sm"
          aria-label="Quick capture (⌘K)"
        >
          <Plus size={16} className="mr-2 shrink-0" aria-hidden="true" />
          Quick capture
          <kbd className="ml-auto text-[10px] font-mono opacity-70 bg-white/10 px-1 rounded">
            ⌘K
          </kbd>
        </Button>
      </div>
    </aside>
  );
}
