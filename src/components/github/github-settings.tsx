"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  importReposFromInstallation,
  disconnectRepository,
} from "@/lib/github/actions";
import { Button } from "@/components/ui/button";

interface Installation {
  id: string;
  installationId: string;
  accountLogin: string | null;
  accountType: string | null;
  suspended: boolean | null;
}

interface Repo {
  id: string;
  fullName: string;
  defaultBranch: string | null;
  private: boolean | null;
  installationId: string | null;
}

interface GitHubSettingsProps {
  configured: boolean;
  installUrl: string | null;
  installations: Installation[];
  repositories: Repo[];
}

export function GitHubSettings({
  configured,
  installations,
  repositories,
}: GitHubSettingsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleImport(installationId: string) {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await importReposFromInstallation(installationId);
      if (result.success) {
        setMessage(
          `Imported ${result.imported} new repos (${result.total} total accessible).`
        );
        router.refresh();
      } else {
        setError(result.error ?? "Import failed");
      }
    });
  }

  function handleDisconnect(repoId: string) {
    startTransition(async () => {
      await disconnectRepository(repoId);
      router.refresh();
    });
  }

  if (!configured) {
    return (
      <section className="rounded-lg border border-border bg-card p-5">
        <h2 className="text-sm font-semibold">GitHub Integration</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          GitHub App is not configured yet. Set{" "}
          <code className="text-xs">GITHUB_APP_ID</code>,{" "}
          <code className="text-xs">GITHUB_APP_PRIVATE_KEY</code>,{" "}
          <code className="text-xs">GITHUB_APP_CLIENT_ID</code>,{" "}
          <code className="text-xs">GITHUB_APP_CLIENT_SECRET</code>, and{" "}
          <code className="text-xs">GITHUB_APP_SLUG</code> in the environment.
          See docs for setup steps.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <h2 className="text-sm font-semibold">GitHub Integration</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Connect repositories via the GitHub App. Access is read-only in this
        phase.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <a href="/api/github/install">
          <Button type="button" size="sm">
            {installations.length > 0 ? "Add installation" : "Install GitHub App"}
          </Button>
        </a>
      </div>

      {message && (
        <p className="mt-3 text-sm text-success">{message}</p>
      )}
      {error && (
        <p className="mt-3 text-sm text-destructive">{error}</p>
      )}

      {installations.length > 0 && (
        <div className="mt-4 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Installations
          </h3>
          {installations.map((inst) => (
            <div
              key={inst.id}
              className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
            >
              <div>
                <span className="font-medium">
                  {inst.accountLogin ?? inst.installationId}
                </span>
                {inst.accountType && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    {inst.accountType}
                  </span>
                )}
                {inst.suspended && (
                  <span className="ml-2 text-xs text-destructive">Suspended</span>
                )}
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={pending}
                onClick={() => handleImport(inst.installationId)}
              >
                Import repos
              </Button>
            </div>
          ))}
        </div>
      )}

      {repositories.length > 0 && (
        <div className="mt-4 space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Connected repositories
          </h3>
          {repositories.map((repo) => (
            <div
              key={repo.id}
              className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
            >
              <div>
                <span className="font-medium">{repo.fullName}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {repo.defaultBranch}
                  {repo.private ? " · private" : " · public"}
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => handleDisconnect(repo.id)}
              >
                Disconnect
              </Button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
