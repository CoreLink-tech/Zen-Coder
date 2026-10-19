"use server";

import { revalidatePath } from "next/cache";
import { and, desc, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { proposedChanges, repositories } from "@/lib/db/schema";
import {
  applyFileChanges,
  createBranch,
  createPullRequest,
  getBranchSha,
  type FileChange,
} from "./client";

export async function listPendingChanges(conversationId?: string) {
  const user = await requireUser();
  const conditions = [
    eq(proposedChanges.userId, user.id),
    eq(proposedChanges.status, "pending"),
  ];
  if (conversationId) {
    conditions.push(eq(proposedChanges.conversationId, conversationId));
  }
  return db.query.proposedChanges.findMany({
    where: and(...conditions),
    orderBy: [desc(proposedChanges.createdAt)],
  });
}

export async function getProposedChange(id: string) {
  const user = await requireUser();
  return db.query.proposedChanges.findFirst({
    where: and(
      eq(proposedChanges.id, id),
      eq(proposedChanges.userId, user.id)
    ),
  });
}

export async function rejectProposedChange(id: string) {
  const user = await requireUser();
  const result = await db
    .update(proposedChanges)
    .set({ status: "rejected", updatedAt: new Date() })
    .where(
      and(
        eq(proposedChanges.id, id),
        eq(proposedChanges.userId, user.id),
        eq(proposedChanges.status, "pending")
      )
    )
    .returning({ id: proposedChanges.id });

  revalidatePath("/coding");
  return { success: result.length > 0 };
}

export type ApplyOptions = {
  /** If true, create a new branch and open a PR instead of committing to the target branch */
  createPr?: boolean;
  prTitle?: string;
  newBranchName?: string;
};

/**
 * Apply an approved proposed change to GitHub.
 * Requires the proposal to be pending; marks it approved then applied/failed.
 */
export async function applyProposedChange(
  id: string,
  options: ApplyOptions = {}
) {
  const user = await requireUser();

  const proposal = await db.query.proposedChanges.findFirst({
    where: and(
      eq(proposedChanges.id, id),
      eq(proposedChanges.userId, user.id),
      eq(proposedChanges.status, "pending")
    ),
  });

  if (!proposal) {
    return { success: false, error: "Proposal not found or not pending" };
  }

  const repo = await db.query.repositories.findFirst({
    where: and(
      eq(repositories.userId, user.id),
      eq(repositories.fullName, proposal.fullName)
    ),
  });

  if (!repo?.installationId) {
    return { success: false, error: "Repository or installation missing" };
  }

  const [owner, name] = proposal.fullName.split("/");
  if (!owner || !name) {
    return { success: false, error: "Invalid repository name" };
  }

  const files = JSON.parse(proposal.files) as Array<{
    path: string;
    action: "create" | "update" | "delete";
    content?: string;
    sha?: string;
  }>;

  const changes: FileChange[] = files.map((f) => ({
    path: f.path,
    action: f.action,
    content: f.content,
    sha: f.sha,
  }));

  try {
    let targetBranch = proposal.branch;
    let prUrl: string | null = null;

    if (options.createPr) {
      const baseSha = await getBranchSha(
        repo.installationId,
        owner,
        name,
        proposal.branch
      );
      const branchName =
        options.newBranchName ||
        `zen-coder/${Date.now().toString(36)}`;
      await createBranch(
        repo.installationId,
        owner,
        name,
        branchName,
        baseSha
      );
      targetBranch = branchName;
    }

    const { results } = await applyFileChanges(
      repo.installationId,
      owner,
      name,
      targetBranch,
      proposal.commitMessage || "Changes from Zen-Coder",
      changes
    );

    const failed = results.filter((r) => !r.ok);
    if (failed.length > 0 && failed.length === results.length) {
      await db
        .update(proposedChanges)
        .set({
          status: "failed",
          result: JSON.stringify({ results }),
          updatedAt: new Date(),
        })
        .where(eq(proposedChanges.id, id));
      return {
        success: false,
        error: failed.map((f) => `${f.path}: ${f.error}`).join("; "),
        results,
      };
    }

    if (options.createPr) {
      const pr = await createPullRequest(
        repo.installationId,
        owner,
        name,
        options.prTitle || proposal.commitMessage || "Zen-Coder changes",
        targetBranch,
        proposal.branch,
        `Proposed and applied via Zen-Coder.\n\n${proposal.commitMessage ?? ""}`
      );
      prUrl = pr.htmlUrl;
    }

    await db
      .update(proposedChanges)
      .set({
        status: "applied",
        result: JSON.stringify({ results, prUrl, branch: targetBranch }),
        updatedAt: new Date(),
      })
      .where(eq(proposedChanges.id, id));

    revalidatePath("/coding");
    return { success: true, results, prUrl, branch: targetBranch };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Apply failed";
    await db
      .update(proposedChanges)
      .set({
        status: "failed",
        result: JSON.stringify({ error: message }),
        updatedAt: new Date(),
      })
      .where(eq(proposedChanges.id, id));
    return { success: false, error: message };
  }
}
