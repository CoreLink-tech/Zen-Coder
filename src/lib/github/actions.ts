"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import {
  githubInstallations,
  repositories,
} from "@/lib/db/schema";
import {
  getInstallationAccount,
  listInstallationRepos,
} from "./client";
import {
  getGitHubAppInstallUrl,
  isGitHubAppConfigured,
} from "./config";

export async function getGitHubStatus() {
  const user = await requireUser();
  const configured = isGitHubAppConfigured();
  const installUrl = getGitHubAppInstallUrl();

  const installations = await db.query.githubInstallations.findMany({
    where: eq(githubInstallations.userId, user.id),
  });

  const repos = await db.query.repositories.findMany({
    where: eq(repositories.userId, user.id),
  });

  return {
    configured,
    installUrl,
    installations: installations.map((i) => ({
      id: i.id,
      installationId: i.installationId,
      accountLogin: i.accountLogin,
      accountType: i.accountType,
      suspended: i.suspended,
    })),
    repositories: repos.map((r) => ({
      id: r.id,
      fullName: r.fullName,
      defaultBranch: r.defaultBranch,
      private: r.private,
      installationId: r.installationId,
    })),
  };
}

/**
 * Record a GitHub App installation after the user completes the install flow.
 * Called from the callback route with the installation_id from GitHub.
 */
export async function linkGitHubInstallation(installationId: string) {
  const user = await requireUser();

  if (!isGitHubAppConfigured()) {
    return { success: false, error: "GitHub App is not configured" };
  }

  try {
    const account = await getInstallationAccount(installationId);

    const existing = await db.query.githubInstallations.findFirst({
      where: eq(githubInstallations.installationId, installationId),
    });

    if (existing) {
      // Re-link to current user if needed (single-tenant install ownership for now)
      if (existing.userId !== user.id) {
        return {
          success: false,
          error: "This installation is linked to another account",
        };
      }
      await db
        .update(githubInstallations)
        .set({
          accountLogin: account.login,
          accountType: account.type,
          permissions: JSON.stringify(account.permissions),
          suspended: false,
          updatedAt: new Date(),
        })
        .where(eq(githubInstallations.id, existing.id));
    } else {
      await db.insert(githubInstallations).values({
        userId: user.id,
        installationId: String(installationId),
        accountLogin: account.login,
        accountType: account.type,
        permissions: JSON.stringify(account.permissions),
      });
    }

    revalidatePath("/settings");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to link installation",
    };
  }
}

/** Import repos from an installation into the user's connected list (read-only metadata) */
export async function importReposFromInstallation(installationId: string) {
  const user = await requireUser();

  const installation = await db.query.githubInstallations.findFirst({
    where: and(
      eq(githubInstallations.installationId, installationId),
      eq(githubInstallations.userId, user.id)
    ),
  });

  if (!installation) {
    return { success: false, error: "Installation not found" };
  }

  try {
    const ghRepos = await listInstallationRepos(installationId);
    let imported = 0;

    for (const repo of ghRepos) {
      const existing = await db.query.repositories.findFirst({
        where: and(
          eq(repositories.userId, user.id),
          eq(repositories.fullName, repo.fullName)
        ),
      });

      if (existing) {
        await db
          .update(repositories)
          .set({
            githubRepoId: repo.id,
            defaultBranch: repo.defaultBranch,
            private: repo.private,
            installationId: String(installationId),
            updatedAt: new Date(),
          })
          .where(eq(repositories.id, existing.id));
      } else {
        await db.insert(repositories).values({
          userId: user.id,
          githubRepoId: repo.id,
          fullName: repo.fullName,
          defaultBranch: repo.defaultBranch,
          private: repo.private,
          installationId: String(installationId),
        });
        imported++;
      }
    }

    revalidatePath("/settings");
    revalidatePath("/coding");
    return { success: true, imported, total: ghRepos.length };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to import repositories",
    };
  }
}

export async function disconnectRepository(repoId: string) {
  const user = await requireUser();
  const result = await db
    .delete(repositories)
    .where(and(eq(repositories.id, repoId), eq(repositories.userId, user.id)))
    .returning({ id: repositories.id });

  revalidatePath("/settings");
  return { success: result.length > 0 };
}
