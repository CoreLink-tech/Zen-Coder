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

  return (
    <div className="flex flex-1 flex-col overflow-auto p-6">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Create structured workflows and run them on demand.
        </p>
        <Button type="button" size="sm" onClick={() => router.push("/automation/new")}>
          New workflow
        </Button>
      </div>

      {workflows.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
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
      ) : (
        <ul className="space-y-2">
          {workflows.map((w) => (
            <li key={w.id}>
              <Link
                href={`/automation/${w.id}`}
                className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:bg-accent/40"
              >
                <div>
                  <div className="font-medium">{w.name}</div>
                  {w.description && (
                    <div className="mt-0.5 text-sm text-muted-foreground">
                      {w.description}
                    </div>
                  )}
                </div>
                <span className="text-xs capitalize text-muted-foreground">
                  {w.status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
