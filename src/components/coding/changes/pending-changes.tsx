"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  applyProposedChange,
  rejectProposedChange,
} from "@/lib/github/changes";
import { Button } from "@/components/ui/button";

interface FileEntry {
  path: string;
  action: string;
  content?: string;
  previousContent?: string;
}

interface Proposal {
  id: string;
  fullName: string;
  branch: string;
  commitMessage: string | null;
  files: string;
  status: string;
  createdAt: Date | number | null;
}

interface PendingChangesProps {
  proposals: Proposal[];
}

export function PendingChanges({ proposals }: PendingChangesProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(
    proposals[0]?.id ?? null
  );

  if (proposals.length === 0) return null;

  function handleApply(id: string, createPr: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await applyProposedChange(id, { createPr });
      if (!result.success) {
        setError(result.error ?? "Failed to apply");
      }
      router.refresh();
    });
  }

  function handleReject(id: string) {
    startTransition(async () => {
      await rejectProposedChange(id);
      router.refresh();
    });
  }

  return (
    <div className="border-b border-border bg-warning/5 px-4 py-3">
      <h3 className="text-sm font-semibold text-foreground">
        Pending changes ({proposals.length})
      </h3>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Review and approve before anything is written to GitHub.
      </p>

      {error && (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <ul className="mt-3 space-y-3">
        {proposals.map((p) => {
          const files = JSON.parse(p.files) as FileEntry[];
          const isOpen = expanded === p.id;

          return (
            <li
              key={p.id}
              className="rounded-md border border-border bg-card p-3 text-sm"
            >
              <button
                type="button"
                className="flex w-full items-start justify-between text-left"
                onClick={() => setExpanded(isOpen ? null : p.id)}
              >
                <div>
                  <div className="font-medium">
                    {p.fullName}{" "}
                    <span className="text-muted-foreground">@{p.branch}</span>
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {p.commitMessage || "No commit message"} · {files.length}{" "}
                    file{files.length === 1 ? "" : "s"}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">
                  {isOpen ? "Hide" : "Show"}
                </span>
              </button>

              {isOpen && (
                <div className="mt-3 space-y-2">
                  {files.map((f) => (
                    <div
                      key={f.path}
                      className="rounded border border-border bg-background p-2"
                    >
                      <div className="flex items-center gap-2 text-xs font-medium">
                        <span
                          className={
                            f.action === "create"
                              ? "text-success"
                              : f.action === "delete"
                                ? "text-destructive"
                                : "text-primary"
                          }
                        >
                          {f.action}
                        </span>
                        <span className="font-mono">{f.path}</span>
                      </div>
                      {f.action !== "delete" && f.content !== undefined && (
                        <pre className="mt-2 max-h-40 overflow-auto rounded bg-muted/50 p-2 text-xs">
                          {f.content.slice(0, 3000)}
                          {f.content.length > 3000 ? "\n…" : ""}
                        </pre>
                      )}
                      {f.previousContent !== undefined && (
                        <details className="mt-1">
                          <summary className="cursor-pointer text-xs text-muted-foreground">
                            Previous content
                          </summary>
                          <pre className="mt-1 max-h-32 overflow-auto rounded bg-muted/30 p-2 text-xs">
                            {f.previousContent.slice(0, 2000)}
                            {f.previousContent.length > 2000 ? "\n…" : ""}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))}

                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      type="button"
                      size="sm"
                      disabled={pending}
                      onClick={() => handleApply(p.id, false)}
                    >
                      Commit to {p.branch}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={pending}
                      onClick={() => handleApply(p.id, true)}
                    >
                      Commit + open PR
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={pending}
                      onClick={() => handleReject(p.id)}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
