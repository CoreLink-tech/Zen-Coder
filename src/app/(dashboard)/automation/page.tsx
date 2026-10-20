import { Header } from "@/components/layout/header";
import { WorkflowList } from "@/components/automation/workflow-list";
import { listAutomationWorkflows } from "@/lib/automation/actions";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function AutomationPage() {
  let workflows: Awaited<ReturnType<typeof listAutomationWorkflows>> = [];
  try {
    workflows = await listAutomationWorkflows();
  } catch (e) {
    console.error("listAutomationWorkflows", e);
  }

  return (
    <>
      <Header
        title="Automation"
        description="Workflows, schedules, and execution history"
        actions={
          <Link href="/automation/new">
            <Button size="sm">New workflow</Button>
          </Link>
        }
      />
      <div className="min-h-0 flex-1 overflow-auto p-4 sm:p-6">
        <WorkflowList
          workflows={workflows.map((w) => ({
            id: w.id,
            name: w.name,
            description: w.description,
            status: w.status,
            updatedAt: w.updatedAt,
          }))}
        />
      </div>
    </>
  );
}
