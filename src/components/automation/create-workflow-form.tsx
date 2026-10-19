"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createWorkflow } from "@/lib/automation/actions";
import { Button } from "@/components/ui/button";

interface ToolOption {
  id: string;
  name: string;
  description: string;
}

const DEFAULT_DEFINITION = {
  version: 1 as const,
  steps: [
    {
      id: "step-1",
      name: "Check example.com",
      toolId: "http_check",
      input: {
        url: "https://example.com",
        method: "GET",
        expectedStatus: 200,
      },
      onFailure: "abort" as const,
    },
    {
      id: "step-2",
      name: "Log success",
      toolId: "log_message",
      input: { message: "Site is up", level: "info" },
      onFailure: "continue" as const,
    },
  ],
};

export function CreateWorkflowForm({ tools }: { tools: ToolOption[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [definitionJson, setDefinitionJson] = useState(
    JSON.stringify(DEFAULT_DEFINITION, null, 2)
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    let definition: unknown;
    try {
      definition = JSON.parse(definitionJson);
    } catch {
      setError("Definition must be valid JSON");
      return;
    }

    startTransition(async () => {
      const result = await createWorkflow({ name, description, definition });
      if (!result.success) {
        setError(result.error ?? "Failed to create");
        return;
      }
      router.push(`/automation/${result.workflowId}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-4 p-6">
      <div>
        <label className="text-sm font-medium" htmlFor="name">
          Name
        </label>
        <input
          id="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1.5 w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          placeholder="Website uptime check"
        />
      </div>

      <div>
        <label className="text-sm font-medium" htmlFor="description">
          Description
        </label>
        <input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1.5 w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          placeholder="Optional"
        />
      </div>

      <div>
        <label className="text-sm font-medium" htmlFor="definition">
          Workflow definition (JSON)
        </label>
        <p className="mt-1 text-xs text-muted-foreground">
          Available tools:{" "}
          {tools.map((t) => t.id).join(", ") || "none"}
        </p>
        <textarea
          id="definition"
          value={definitionJson}
          onChange={(e) => setDefinitionJson(e.target.value)}
          rows={18}
          className="mt-1.5 w-full rounded-md border border-border bg-card px-3 py-2 font-mono text-xs outline-none focus:ring-2 focus:ring-primary"
          spellCheck={false}
        />
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create workflow"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={() => router.push("/automation")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
