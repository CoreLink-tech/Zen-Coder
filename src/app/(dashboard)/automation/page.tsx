import { Header } from "@/components/layout/header";
import { EmptyState } from "@/components/ui/empty-state";

export default function AutomationPage() {
  return (
    <>
      <Header
        title="Automation"
        description="Workflows, schedules, and execution history"
      />
      <div className="flex flex-1 flex-col overflow-auto p-6">
        <EmptyState
          title="No workflows yet"
          description="Describe an automation in natural language or create one manually. Execution engine arrives in Phase 9+."
          actionLabel="Coming soon"
        />
      </div>
    </>
  );
}
