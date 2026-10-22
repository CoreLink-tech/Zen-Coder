"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  runWorkflow,
  setWorkflowStatus,
  deleteWorkflow,
} from "@/lib/automation/actions";
import { Badge, statusTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

interface Execution {
  id: string;
  status: string;
  trigger: string;
  error: string | null;
  logs: string | null;
  startedAt: Date | number | null;
  finishedAt: Date | number | null;
  createdAt: Date | number | null;
}

interface Version {
  id: string;
  version: number;
  definition: string;
  summary: string | null;
}

interface WorkflowDetailProps {
  workflow: {
    id: string;
    name: string;
    description: string | null;
    status: string;
  };
  versions: Version[];
  executions: Execution[];
}

export function WorkflowDetail({
  workflow,
  versions,
  executions,
}: WorkflowDetailProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastLogs, setLastLogs] = useState<string | null>(null);

  const current = versions[0];

  function handleRun() {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await runWorkflow(workflow.id);
      if (result.success) {
        setMessage("Execution succeeded");
        setLastLogs(JSON.stringify(result.steps, null, 2));
      } else {
        setError(result.error ?? "Execution failed");
        if (result.steps) {
          setLastLogs(JSON.stringify(result.steps, null, 2));
        }
      }
      router.refresh();
    });
  }

  function handleStatus(status: "active" | "paused" | "disabled") {
    startTransition(async () => {
      await setWorkflowStatus(workflow.id, status);
      router.refresh();
    });
  }

  function handleDelete() {
    if (!confirm("Delete this workflow?")) return;
    startTransition(async () => {
      await deleteWorkflow(workflow.id);
      router.push("/automation");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-title text-foreground">{workflow.name}</h2>
          {workflow.description && (
            <p className="mt-1 text-sm text-muted-foreground">{workflow.description}</p>
          )}
          <div className="mt-2">
            <Badge tone={statusTone(workflow.status)} className="capitalize">
              {workflow.status}
            </Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" disabled={pending} onClick={handleRun}>
            {pending ? "Running…" : "Run now"}
          </Button>
          <Button type="button" size="sm" variant="secondary" disabled={pending} onClick={() => handleStatus("paused")}>
            Pause
          </Button>
          <Button type="button" size="sm" variant="secondary" disabled={pending} onClick={() => handleStatus("active")}>
            Activate
          </Button>
          <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </div>

      {message && (
        <p role="status" className="rounded-md border border-success/25 bg-success-soft px-3 py-2 text-sm text-success">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-md border border-destructive/25 bg-destructive-soft px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {current && (
        <Card>
          <CardHeader>
            <CardTitle>Definition (v{current.version})</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="max-h-64 overflow-auto rounded-md border border-border bg-muted/40 p-3 font-mono text-xs leading-relaxed">
              {(() => {
                try {
                  return JSON.stringify(JSON.parse(current.definition), null, 2);
                } catch {
                  return current.definition;
                }
              })()}
            </pre>
          </CardContent>
        </Card>
      )}

      {lastLogs && (
        <Card>
          <CardHeader>
            <CardTitle>Last run steps</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="max-h-64 overflow-auto rounded-md border border-border bg-muted/40 p-3 font-mono text-xs leading-relaxed">
              {lastLogs}
            </pre>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Execution history</CardTitle>
        </CardHeader>
        <CardContent>
          {executions.length === 0 ? (
            <EmptyState title="No runs yet" description="Run the workflow to see its execution history here." />
          ) : (
            <ul className="divide-y divide-border text-sm">
              {executions.map((ex) => (
                <li key={ex.id} className="flex items-center justify-between gap-3 py-2.5">
                  <Badge tone={statusTone(ex.status)} className="capitalize">
                    {ex.status}
                  </Badge>
                  <span className="min-w-0 truncate text-xs text-muted-foreground">
                    {ex.trigger}
                    {ex.error ? ` · ${ex.error}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
