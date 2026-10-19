"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  runWorkflow,
  setWorkflowStatus,
  deleteWorkflow,
} from "@/lib/automation/actions";
import { Button } from "@/components/ui/button";

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
    <div className="flex-1 space-y-6 overflow-auto p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{workflow.name}</h2>
          {workflow.description && (
            <p className="mt-1 text-sm text-muted-foreground">
              {workflow.description}
            </p>
          )}
          <p className="mt-1 text-xs capitalize text-muted-foreground">
            Status: {workflow.status}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" disabled={pending} onClick={handleRun}>
            {pending ? "Running…" : "Run now"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={pending}
            onClick={() => handleStatus("paused")}
          >
            Pause
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={pending}
            onClick={() => handleStatus("active")}
          >
            Activate
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={handleDelete}
          >
            Delete
          </Button>
        </div>
      </div>

      {message && <p className="text-sm text-success">{message}</p>}
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {current && (
        <section className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-semibold">
            Definition (v{current.version})
          </h3>
          <pre className="mt-2 max-h-64 overflow-auto rounded bg-muted/40 p-3 text-xs">
            {(() => {
              try {
                return JSON.stringify(JSON.parse(current.definition), null, 2);
              } catch {
                return current.definition;
              }
            })()}
          </pre>
        </section>
      )}

      {lastLogs && (
        <section className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-semibold">Last run steps</h3>
          <pre className="mt-2 max-h-64 overflow-auto rounded bg-muted/40 p-3 text-xs">
            {lastLogs}
          </pre>
        </section>
      )}

      <section className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold">Execution history</h3>
        {executions.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No runs yet</p>
        ) : (
          <ul className="mt-2 space-y-2 text-sm">
            {executions.map((ex) => (
              <li
                key={ex.id}
                className="flex items-center justify-between border-b border-border/50 py-2"
              >
                <span className="capitalize">{ex.status}</span>
                <span className="text-xs text-muted-foreground">
                  {ex.trigger}
                  {ex.error ? ` · ${ex.error}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
