import { notFound } from "next/navigation";
import { Header } from "@/components/layout/header";
import { WorkflowDetail } from "@/components/automation/workflow-detail";
import { ScheduleForm } from "@/components/automation/schedule-form";
import { getAutomationWorkflow } from "@/lib/automation/actions";
import { listSchedulesForWorkflow } from "@/lib/automation/schedule-actions";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AutomationWorkflowPage({ params }: PageProps) {
  const { id } = await params;
  const [workflow, schedules] = await Promise.all([
    getAutomationWorkflow(id),
    listSchedulesForWorkflow(id),
  ]);

  if (!workflow) {
    notFound();
  }

  const schedule = schedules[0] ?? null;

  return (
    <>
      <Header title={workflow.name} description="Workflow details & runs" />
      <div className="flex-1 space-y-6 overflow-auto p-6">
        <ScheduleForm
          workflowId={workflow.id}
          schedule={
            schedule
              ? {
                  id: schedule.id,
                  type: schedule.type,
                  expression: schedule.expression,
                  enabled: schedule.enabled,
                  nextRunAt: schedule.nextRunAt,
                  lastRunAt: schedule.lastRunAt,
                }
              : null
          }
        />
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
      </div>
    </>
  );
}
