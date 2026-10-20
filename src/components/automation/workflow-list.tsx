"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface WorkflowItem {
  id: string;
  name: string;
  description: string | null;
  status: string;
  updatedAt: Date | number | null;
}

export function WorkflowList({ workflows }: { workflows: WorkflowItem[] }) {
  const router = useRouter();

  if (workflows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border px-4 py-16 text-center">
        <h3 className="text-base font-semibold">No workflows yet</h3>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Create a workflow with HTTP checks or log steps, then run it from the
          detail page.
        </p>
        <Button
          type="button"
          className="mt-6"
          onClick={() => router.push("/automation/new")}
        >
          Create workflow
        </Button>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {workflows.map((w) => (
        <li key={w.id}>
          <Link
            href={`/automation/${w.id}`}
            className="flex flex-col gap-1 rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:bg-accent/40 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <div className="truncate font-medium">{w.name}</div>
              {w.description && (
                <div className="mt-0.5 truncate text-sm text-muted-foreground">
                  {w.description}
                </div>
              )}
            </div>
            <span className="shrink-0 text-xs capitalize text-muted-foreground">
              {w.status}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
