import { notFound } from "next/navigation";
import { Header } from "@/components/layout/header";
import { WorkflowDetail } from "@/components/automation/workflow-detail";
import { getAutomationWorkflow } from "@/lib/automation/actions";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AutomationWorkflowPage({ params }: PageProps) {
  const { id } = await params;
  const workflow = await getAutomationWorkflow(id);

  if (!workflow) {
    notFound();
  }

  return (
    <>
      <Header title={workflow.name} description="Workflow details & runs" />
      <WorkflowDetail
        workflow={{
          id: workflow.id,
          name: workflow.name,
          description: workflow.description,
          status: workflow.status,
        }}
        versions={(workflow.versions ?? []).map((v) => ({
          id: v.id,
          version: v.version,
          definition: v.definition,
          summary: v.summary,
        }))}
        executions={(workflow.executions ?? []).map((e) => ({
          id: e.id,
          status: e.status,
          trigger: e.trigger,
          error: e.error,
          logs: e.logs,
          startedAt: e.startedAt,
          finishedAt: e.finishedAt,
          createdAt: e.createdAt,
        }))}
      />
    </>
  );
}
