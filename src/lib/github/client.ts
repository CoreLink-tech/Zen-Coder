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
