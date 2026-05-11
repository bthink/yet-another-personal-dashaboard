import { mockInboxItems } from "@/lib/mock-data"

// Placeholder - full implementation in Task 1.6
export default function InboxPanel(): React.ReactElement {
  return (
    <div className="p-4">
      <h2 className="text-sm font-semibold text-accent mb-1">Inbox</h2>
      <p className="text-xs text-muted-foreground">{mockInboxItems.length} items</p>
    </div>
  )
}
