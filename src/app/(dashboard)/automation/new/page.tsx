import { Header } from "@/components/layout/header";
import { CreateWorkflowForm } from "@/components/automation/create-workflow-form";
import { listAutomationTools } from "@/lib/automation/actions";

export default async function NewWorkflowPage() {
  const tools = await listAutomationTools();

  return (
    <>
      <Header title="New workflow" description="Define steps and tools" />
      <CreateWorkflowForm tools={tools} />
    </>
  );
}
