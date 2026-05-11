import InboxPanel from "@/components/dashboard/InboxPanel"
import TodoPanel from "@/components/dashboard/TodoPanel"
import ContextPanel from "@/components/dashboard/ContextPanel"

export default function DashboardContent(): React.ReactElement {
  return (
    <div className="flex flex-1 overflow-hidden h-full">
      <section
        className="basis-[45%] shrink-0 overflow-y-auto border-r border-border"
        aria-label="Inbox"
      >
        <InboxPanel />
      </section>
      <section
        className="basis-[30%] shrink-0 overflow-y-auto border-r border-border"
        aria-label="Todo"
      >
        <TodoPanel />
      </section>
      <section
        className="basis-[25%] min-w-0 overflow-y-auto"
        aria-label="AI Context"
      >
        <ContextPanel />
      </section>
    </div>
  )
}
