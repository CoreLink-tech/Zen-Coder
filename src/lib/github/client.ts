/**
 * GitHub App client helpers.
 *
 * All operations use installation tokens (least privilege).
 * Write operations are intentionally not exposed in Phase 6.
 */

import { App, Octokit } from "octokit";
import { getGitHubAppConfig, isGitHubAppConfigured } from "./config";

let appInstance: App | null = null;

function getApp(): App {
  const config = getGitHubAppConfig();
  if (!config) {
    throw new Error("GitHub App is not configured");
  }
  if (!appInstance) {
    appInstance = new App({
      appId: config.appId,
      privateKey: config.privateKey,
      oauth: {
        clientId: config.clientId,
        clientSecret: config.clientSecret,
      },
    });
  }
  return appInstance;
}

/** Octokit authenticated as the GitHub App installation */
export async function getInstallationOctokit(
  installationId: string | number
): Promise<Octokit> {
  if (!isGitHubAppConfigured()) {
    throw new Error("GitHub App is not configured");
  }
  const app = getApp();
  return app.getInstallationOctokit(Number(installationId));
}

export interface GhRepoSummary {
  id: number;
  fullName: string;
  private: boolean;
  defaultBranch: string;
  description: string | null;
  htmlUrl: string;
}

/** List repositories accessible to an installation */
export async function listInstallationRepos(
  installationId: string | number
): Promise<GhRepoSummary[]> {
  const octokit = await getInstallationOctokit(installationId);
  const repos: GhRepoSummary[] = [];

  for await (const response of octokit.paginate.iterator(
    octokit.rest.apps.listReposAccessibleToInstallation,
    { per_page: 100 }
  )) {
    for (const repo of response.data as Array<{
      id: number;
      full_name: string;
      private: boolean;
      default_branch: string;
      description: string | null;
      html_url: string;
    }>) {
      repos.push({
        id: repo.id,
        fullName: repo.full_name,
        private: repo.private,
        defaultBranch: repo.default_branch,
        description: repo.description,
        htmlUrl: repo.html_url,
      });
    }
  }

  return repos;
}

/** Get installation metadata */
export async function getInstallationAccount(installationId: string | number) {
  const octokit = await getInstallationOctokit(installationId);
  const { data } = await octokit.rest.apps.getInstallation({
    installation_id: Number(installationId),
  });
  const account = data.account as {
    login?: string;
    type?: string;
  } | null;
  return {
    login: account?.login ?? null,
    type: account?.type ?? null,
    permissions: data.permissions,
  };
}

/** List files/directories at a path (read-only) */
export async function listRepoContents(
  installationId: string | number,
  owner: string,
  repo: string,
  path: string = "",
  ref?: string
) {
  const octokit = await getInstallationOctokit(installationId);
  const { data } = await octokit.rest.repos.getContent({
    owner,
    repo,
    path: path || "",
    ...(ref ? { ref } : {}),
  });

  if (Array.isArray(data)) {
    return data.map((item) => ({
      name: item.name,
      path: item.path,
      type: item.type as "file" | "dir" | "symlink" | "submodule",
      size: item.size,
      sha: item.sha,
    }));
  }

  // Single file
  return [
    {
      name: data.name,
      path: data.path,
      type: data.type as "file" | "dir",
      size: data.size,
      sha: data.sha,
    },
  ];
}

/** Read a text file from a repository (read-only, size-capped) */
export async function readRepoFile(
  installationId: string | number,
  owner: string,
  repo: string,
  path: string,
  ref?: string,
  maxBytes = 200_000
): Promise<{ content: string; size: number; encoding: string; sha: string }> {
  const octokit = await getInstallationOctokit(installationId);
  const { data } = await octokit.rest.repos.getContent({
    owner,
    repo,
    path,
    ...(ref ? { ref } : {}),
  });

  if (Array.isArray(data) || data.type !== "file") {
    throw new Error("Path is not a file");
  }

  if (data.size > maxBytes) {
    throw new Error(
      `File too large (${data.size} bytes). Max ${maxBytes} bytes for context.`
    );
  }

  // Content is base64 for files
  const encoding = data.encoding ?? "base64";
  let content = "";
  if (data.content && encoding === "base64") {
    content = Buffer.from(data.content, "base64").toString("utf-8");
  } else if (data.content) {
    content = data.content;
  }

  return {
    content,
    size: data.size,
    encoding,
    sha: data.sha,
  };
}

/** Get default branch and basic repo info */
export async function getRepoInfo(
  installationId: string | number,
  owner: string,
  repo: string
) {
  const octokit = await getInstallationOctokit(installationId);
  const { data } = await octokit.rest.repos.get({ owner, repo });
  return {
    id: data.id,
    fullName: data.full_name,
    defaultBranch: data.default_branch,
    private: data.private,
    description: data.description,
    language: data.language,
  };
}

// ---------------------------------------------------------------------------
// Write operations (Phase 7) — require user approval before calling
// ---------------------------------------------------------------------------

export interface FileChange {
  path: string;
  action: "create" | "update" | "delete";
  content?: string;
  /** Required for update/delete when using Contents API */
  sha?: string;
}

/**
 * Create or update a single file via the Contents API.
 * Prefer applyFileChanges for multi-file commits.
 */
export async function createOrUpdateFile(
  installationId: string | number,
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  branch: string,
  sha?: string
) {
  const octokit = await getInstallationOctokit(installationId);
  const { data } = await octokit.rest.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message,
    content: Buffer.from(content, "utf-8").toString("base64"),
    branch,
    ...(sha ? { sha } : {}),
  });
  return {
    commitSha: data.commit.sha ?? null,
    contentSha: data.content?.sha ?? null,
    htmlUrl: data.content?.html_url ?? null,
  };
}

/**
 * Apply multiple file changes as individual commits on a branch.
 * For a true multi-file single commit, the Git Data API would be used;
 * this phased approach is simpler and auditable per file.
 */
export async function applyFileChanges(
  installationId: string | number,
  owner: string,
  repo: string,
  branch: string,
  message: string,
  changes: FileChange[]
): Promise<{ results: Array<{ path: string; ok: boolean; error?: string; commitSha?: string | null }> }> {
  const octokit = await getInstallationOctokit(installationId);
  const results: Array<{
    path: string;
    ok: boolean;
    error?: string;
    commitSha?: string | null;
  }> = [];

  for (const change of changes) {
    try {
      if (change.action === "delete") {
        if (!change.sha) {
          results.push({ path: change.path, ok: false, error: "sha required for delete" });
          continue;
        }
        const { data } = await octokit.rest.repos.deleteFile({
          owner,
          repo,
          path: change.path,
          message: `${message} (delete ${change.path})`,
          sha: change.sha,
          branch,
        });
        results.push({
          path: change.path,
          ok: true,
          commitSha: data.commit.sha ?? null,
        });
      } else {
        const { data } = await octokit.rest.repos.createOrUpdateFileContents({
          owner,
          repo,
          path: change.path,
          message:
            changes.length === 1
              ? message
              : `${message} (${change.action} ${change.path})`,
          content: Buffer.from(change.content ?? "", "utf-8").toString("base64"),
          branch,
          ...(change.sha ? { sha: change.sha } : {}),
        });
        results.push({
          path: change.path,
          ok: true,
          commitSha: data.commit.sha ?? null,
        });
      }
    } catch (err) {
      results.push({
        path: change.path,
        ok: false,
        error: err instanceof Error ? err.message : "Write failed",
      });
    }
  }

  return { results };
}

/** Create a pull request */
export async function createPullRequest(
  installationId: string | number,
  owner: string,
  repo: string,
  title: string,
  head: string,
  base: string,
  body?: string
) {
  const octokit = await getInstallationOctokit(installationId);
  const { data } = await octokit.rest.pulls.create({
    owner,
    repo,
    title,
    head,
    base,
    body: body ?? "",
  });
  return {
    number: data.number,
    htmlUrl: data.html_url,
    state: data.state,
  };
}

/** Create a new branch from a base ref */
export async function createBranch(
  installationId: string | number,
  owner: string,
  repo: string,
  newBranch: string,
  fromSha: string
) {
  const octokit = await getInstallationOctokit(installationId);
  await octokit.rest.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${newBranch}`,
    sha: fromSha,
  });
  return { ref: `refs/heads/${newBranch}`, sha: fromSha };
}

/** Get the latest commit SHA for a branch */
export async function getBranchSha(
  installationId: string | number,
  owner: string,
  repo: string,
  branch: string
) {
  const octokit = await getInstallationOctokit(installationId);
  const { data } = await octokit.rest.repos.getBranch({
    owner,
    repo,
    branch,
  });
  return data.commit.sha;
}
