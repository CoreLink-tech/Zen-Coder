/**
 * GitHub write tools — always create a proposed change for user approval.
 * The agent never writes directly to the repository.
 */

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { proposedChanges, repositories } from "@/lib/db/schema";
import { readRepoFile } from "@/lib/github/client";
import type { ToolDefinition } from "./types";

const fileChangeSchema = z.object({
  path: z.string().min(1).max(500),
  action: z.enum(["create", "update", "delete"]),
  content: z.string().max(500_000).optional(),
});

export const proposeFileChangesTool: ToolDefinition<
  {
    fullName: string;
    branch?: string;
    commitMessage: string;
    files: Array<{
      path: string;
      action: "create" | "update" | "delete";
      content?: string;
    }>;
  },
  { proposalId: string; status: string; fileCount: number }
> = {
  id: "propose_file_changes",
  name: "Propose file changes",
  description:
    "Propose file creates/updates/deletes on a connected repository. Changes are NOT applied until the user approves them in the UI.",
  inputSchema: z.object({
    fullName: z.string().regex(/^[\w.-]+\/[\w.-]+$/),
    branch: z.string().max(200).optional(),
    commitMessage: z.string().min(1).max(500),
    files: z.array(fileChangeSchema).min(1).max(20),
  }),
  risk: "high",
  requiresConfirmation: true,
  timeoutMs: 30_000,
  permissions: [],
  async execute(input, ctx) {
    const repo = await db.query.repositories.findFirst({
      where: and(
        eq(repositories.userId, ctx.userId),
        eq(repositories.fullName, input.fullName)
      ),
    });

    if (!repo || !repo.installationId) {
      return {
        success: false,
        error: "Repository not connected or missing installation",
      };
    }

    const branch = input.branch || repo.defaultBranch || "main";
    const [owner, name] = input.fullName.split("/");

    // Enrich updates/deletes with current content + sha for diff preview
    const enriched = [];
    for (const f of input.files) {
      let previousContent: string | undefined;
      let sha: string | undefined;

      if (f.action === "update" || f.action === "delete") {
        try {
          const current = await readRepoFile(
            repo.installationId,
            owner!,
            name!,
            f.path,
            branch
          );
          previousContent = current.content;
          sha = current.sha;
        } catch {
          if (f.action === "update") {
            // File may not exist — treat as create
          }
        }
      }

      enriched.push({
        path: f.path,
        action: f.action === "update" && !sha ? "create" : f.action,
        content: f.content,
        previousContent,
        sha,
      });
    }

    const [proposal] = await db
      .insert(proposedChanges)
      .values({
        userId: ctx.userId,
        conversationId: ctx.conversationId,
        taskId: ctx.taskId,
        repositoryId: repo.id,
        fullName: input.fullName,
        branch,
        files: JSON.stringify(enriched),
        commitMessage: input.commitMessage,
        status: "pending",
      })
      .returning();

    return {
      success: true,
      data: {
        proposalId: proposal.id,
        status: "pending",
        fileCount: enriched.length,
      },
    };
  },
};

export const GITHUB_WRITE_TOOLS: ToolDefinition[] = [proposeFileChangesTool];
