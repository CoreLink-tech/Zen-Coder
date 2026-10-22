"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge, statusTone } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

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
      <EmptyState
        title="No workflows yet"
        description="Create a workflow with HTTP checks or log steps, then run it from the detail page."
        actionLabel="Create workflow"
        onAction={() => router.push("/automation/new")}
      />
    );
  }

  return (
    <Card className="divide-y divide-border overflow-hidden">
      {workflows.map((w) => (
        <Link
          key={w.id}
          href={`/automation/${w.id}`}
          className="group flex items-center justify-between gap-4 px-4 py-3.5 transition-colors hover:bg-accent/50 focus-visible:bg-accent/50 focus-visible:outline-none sm:px-5"
        >
          <div className="min-w-0">
            <div className="truncate font-medium text-foreground group-hover:text-primary">{w.name}</div>
            {w.description && (
              <div className="mt-0.5 truncate text-sm text-muted-foreground">{w.description}</div>
            )}
          </div>
          <Badge tone={statusTone(w.status)} className="shrink-0 capitalize">
            {w.status}
          </Badge>
        </Link>
      ))}
    </Card>
  );
}
