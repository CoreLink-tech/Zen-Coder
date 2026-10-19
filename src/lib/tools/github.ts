/**
 * Read-only GitHub repository tools for the Coding agent.
 * Write operations are intentionally omitted until Phase 7.
 */

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { repositories } from "@/lib/db/schema";
import {
  listRepoContents,
  readRepoFile,
  getRepoInfo,
} from "@/lib/github/client";
import type { ToolDefinition } from "./types";

async function resolveRepo(userId: string, fullName: string) {
  const repo = await db.query.repositories.findFirst({
    where: and(
      eq(repositories.userId, userId),
      eq(repositories.fullName, fullName)
    ),
  });
  if (!repo) {
    return null;
  }
  if (!repo.installationId) {
    return null;
  }
  const [owner, name] = fullName.split("/");
  if (!owner || !name) return null;
  return { repo, owner, name, installationId: repo.installationId };
}

export const listConnectedReposTool: ToolDefinition<
  Record<string, never>,
  { repositories: Array<{ fullName: string; defaultBranch: string | null; private: boolean | null }> }
> = {
  id: "list_connected_repos",
  name: "List connected repositories",
  description:
    "List GitHub repositories the user has connected to Zen-Coder.",
  inputSchema: z.object({}),
  risk: "low",
  requiresConfirmation: false,
  timeoutMs: 10_000,
  permissions: [],
  async execute(_input, ctx) {
    const repos = await db.query.repositories.findMany({
      where: eq(repositories.userId, ctx.userId),
    });
    return {
      success: true,
      data: {
        repositories: repos.map((r) => ({
          fullName: r.fullName,
          defaultBranch: r.defaultBranch,
          private: r.private,
        })),
      },
    };
  },
};

export const listRepoFilesTool: ToolDefinition<
  { fullName: string; path?: string; ref?: string },
  { entries: Array<{ name: string; path: string; type: string; size?: number }> }
> = {
  id: "list_repo_files",
  name: "List repository files",
  description:
    "List files and directories at a path in a connected GitHub repository. Read-only.",
  inputSchema: z.object({
    fullName: z
      .string()
      .regex(/^[\w.-]+\/[\w.-]+$/, "Must be owner/repo"),
    path: z.string().max(500).optional(),
    ref: z.string().max(200).optional(),
  }),
  risk: "low",
  requiresConfirmation: false,
  timeoutMs: 15_000,
  permissions: [],
  async execute(input, ctx) {
    const resolved = await resolveRepo(ctx.userId, input.fullName);
    if (!resolved) {
      return {
        success: false,
        error: "Repository not connected or missing installation",
      };
    }

    try {
      const entries = await listRepoContents(
        resolved.installationId,
        resolved.owner,
        resolved.name,
        input.path ?? "",
        input.ref
      );
      return { success: true, data: { entries } };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to list files",
      };
    }
  },
};

export const readRepoFileTool: ToolDefinition<
  { fullName: string; path: string; ref?: string },
  { content: string; size: number; path: string; sha: string }
> = {
  id: "read_repo_file",
  name: "Read repository file",
  description:
    "Read the contents of a text file from a connected GitHub repository. Read-only. Max ~200KB.",
  inputSchema: z.object({
    fullName: z
      .string()
      .regex(/^[\w.-]+\/[\w.-]+$/, "Must be owner/repo"),
    path: z.string().min(1).max(500),
    ref: z.string().max(200).optional(),
  }),
  risk: "low",
  requiresConfirmation: false,
  timeoutMs: 15_000,
  permissions: [],
  async execute(input, ctx) {
    const resolved = await resolveRepo(ctx.userId, input.fullName);
    if (!resolved) {
      return {
        success: false,
        error: "Repository not connected or missing installation",
      };
    }

    try {
      const file = await readRepoFile(
        resolved.installationId,
        resolved.owner,
        resolved.name,
        input.path,
        input.ref
      );
      return {
        success: true,
        data: {
          content: file.content,
          size: file.size,
          path: input.path,
          sha: file.sha,
        },
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to read file",
      };
    }
  },
};

export const getRepoInfoTool: ToolDefinition<
  { fullName: string },
  {
    fullName: string;
    defaultBranch: string;
    private: boolean;
    description: string | null;
    language: string | null;
  }
> = {
  id: "get_repo_info",
  name: "Get repository info",
  description:
    "Get metadata for a connected GitHub repository (default branch, language, etc.).",
  inputSchema: z.object({
    fullName: z
      .string()
      .regex(/^[\w.-]+\/[\w.-]+$/, "Must be owner/repo"),
  }),
  risk: "low",
  requiresConfirmation: false,
  timeoutMs: 10_000,
  permissions: [],
  async execute(input, ctx) {
    const resolved = await resolveRepo(ctx.userId, input.fullName);
    if (!resolved) {
      return {
        success: false,
        error: "Repository not connected or missing installation",
      };
    }

    try {
      const info = await getRepoInfo(
        resolved.installationId,
        resolved.owner,
        resolved.name
      );
      return {
        success: true,
        data: {
          fullName: info.fullName,
          defaultBranch: info.defaultBranch,
          private: info.private,
          description: info.description,
          language: info.language,
        },
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to get repo info",
      };
    }
  },
};

export const GITHUB_TOOLS: ToolDefinition[] = [
  listConnectedReposTool,
  listRepoFilesTool,
  readRepoFileTool,
  getRepoInfoTool,
];
