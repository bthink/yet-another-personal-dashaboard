export default function DashboardContent() {
  return (
    <div className="flex flex-1 overflow-hidden h-full">
      <main className="flex-1 overflow-y-auto p-4">
        <p className="text-sm text-muted-foreground">Main</p>
      </main>
      <aside
        className="w-[280px] shrink-0 border-l border-border overflow-y-auto p-4"
        aria-label="Right panel"
      >
        <p className="text-sm text-muted-foreground">Right panel</p>
      </aside>
    </div>
  );
}
