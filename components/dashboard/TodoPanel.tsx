import { mockTodoSections } from "@/lib/mock-data"

// Placeholder - full implementation in Task 1.7
export default function TodoPanel(): React.ReactElement {
  const totalItems = mockTodoSections.reduce((sum, section) => sum + section.items.length, 0)

  return (
    <div className="p-4">
      <h2 className="text-sm font-semibold text-accent mb-1">Todo</h2>
      <p className="text-xs text-muted-foreground">{totalItems} items across {mockTodoSections.length} sections</p>
    </div>
  )
}
