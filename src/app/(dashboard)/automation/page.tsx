import { Header } from "@/components/layout/header";
import { WorkflowList } from "@/components/automation/workflow-list";
import { listAutomationWorkflows } from "@/lib/automation/actions";

export default async function AutomationPage() {
  const workflows = await listAutomationWorkflows();

  return (
    <>
      <Header
        title="Automation"
        description="Workflows, schedules, and execution history"
      />
      <WorkflowList
        workflows={workflows.map((w) => ({
          id: w.id,
          name: w.name,
          description: w.description,
          status: w.status,
          updatedAt: w.updatedAt,
        }))}
      />
    </>
  );
}
