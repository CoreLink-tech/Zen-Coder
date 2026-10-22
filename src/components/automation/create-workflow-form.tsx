"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createWorkflow } from "@/lib/automation/actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";

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
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-5 p-4 sm:p-6">
      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Website uptime check"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="definition">Workflow definition (JSON)</Label>
        <p className="text-xs text-muted-foreground">
          Available tools:{" "}
          {tools.map((t) => t.id).join(", ") || "none"}
        </p>
        <Textarea
          id="definition"
          value={definitionJson}
          onChange={(e) => setDefinitionJson(e.target.value)}
          rows={18}
          className="font-mono text-xs leading-relaxed"
          spellCheck={false}
        />
      </div>

      {error && (
        <p role="alert" className="rounded-md border border-destructive/25 bg-destructive-soft px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
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
