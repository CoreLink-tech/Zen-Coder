/**
 * Server-side data access helpers with ownership enforcement.
 *
 * Every read/write that touches user data must go through these
 * (or equivalent) functions so that tenant isolation is enforced
 * on the server, not the client.
 */

import { and, desc, eq } from "drizzle-orm";
import { db } from "./index";
import {
  agentTasks,
  conversations,
  creditAccounts,
  messages,
  projects,
  repositories,
  users,
  workflows,
  type NewProject,
  type NewUser,
  type User,
} from "./schema";

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export async function getUserById(id: string): Promise<User | undefined> {
  return db.query.users.findFirst({
    where: eq(users.id, id),
  });
}

export async function getUserByEmail(
  email: string
): Promise<User | undefined> {
  return db.query.users.findFirst({
    where: eq(users.email, email),
  });
}

export async function createUser(data: NewUser): Promise<User> {
  const id = data.id ?? crypto.randomUUID();
  await db.insert(users).values({ ...data, id });
  // Every user gets a credit account with zero balance
  await db.insert(creditAccounts).values({
    userId: id,
    balance: 0,
    reserved: 0,
  });
  const user = await getUserById(id);
  if (!user) {
    throw new Error("User was inserted but could not be loaded");
  }
  return user;
}

// ---------------------------------------------------------------------------
// Projects (ownership required)
// ---------------------------------------------------------------------------

export async function listProjectsForUser(userId: string) {
  return db.query.projects.findMany({
    where: eq(projects.userId, userId),
    orderBy: [desc(projects.updatedAt)],
  });
}

export async function getProjectForUser(projectId: string, userId: string) {
  return db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), eq(projects.userId, userId)),
  });
}

export async function createProjectForUser(
  userId: string,
  data: Omit<NewProject, "userId">
) {
  const [project] = await db
    .insert(projects)
    .values({ ...data, userId })
    .returning();
  return project;
}

export async function deleteProjectForUser(projectId: string, userId: string) {
  const result = await db
    .delete(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .returning({ id: projects.id });
  return result.length > 0;
}

// ---------------------------------------------------------------------------
// Repositories
// ---------------------------------------------------------------------------

export async function listRepositoriesForUser(userId: string) {
  return db.query.repositories.findMany({
    where: eq(repositories.userId, userId),
    orderBy: [desc(repositories.updatedAt)],
  });
}

export async function getRepositoryForUser(repoId: string, userId: string) {
  return db.query.repositories.findFirst({
    where: and(eq(repositories.id, repoId), eq(repositories.userId, userId)),
  });
}

// ---------------------------------------------------------------------------
// Conversations
// ---------------------------------------------------------------------------

export async function listConversationsForUser(
  userId: string,
  workspace?: "coding" | "automation"
) {
  const conditions = [eq(conversations.userId, userId)];
  if (workspace) {
    conditions.push(eq(conversations.workspace, workspace));
  }
  return db.query.conversations.findMany({
    where: and(...conditions),
    orderBy: [desc(conversations.updatedAt)],
  });
}

export async function getConversationForUser(
  conversationId: string,
  userId: string
) {
  return db.query.conversations.findFirst({
    where: and(
      eq(conversations.id, conversationId),
      eq(conversations.userId, userId)
    ),
    with: {
      messages: {
        orderBy: (m, { asc }) => [asc(m.createdAt)],
      },
    },
  });
}

export async function createConversationForUser(
  userId: string,
  data: {
    workspace: "coding" | "automation";
    title?: string;
    projectId?: string;
  }
) {
  const [conversation] = await db
    .insert(conversations)
    .values({
      userId,
      workspace: data.workspace,
      title: data.title,
      projectId: data.projectId,
    })
    .returning();
  return conversation;
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

export async function addMessage(
  conversationId: string,
  userId: string,
  data: {
    role: "user" | "assistant" | "system" | "tool";
    content: string;
    metadata?: string;
  }
) {
  // Ownership check via conversation
  const conversation = await getConversationForUser(conversationId, userId);
  if (!conversation) {
    throw new Error("Conversation not found or access denied");
  }

  const [message] = await db
    .insert(messages)
    .values({
      conversationId,
      role: data.role,
      content: data.content,
      metadata: data.metadata,
    })
    .returning();
  return message;
}

// ---------------------------------------------------------------------------
// Agent Tasks
// ---------------------------------------------------------------------------

export async function listTasksForUser(
  userId: string,
  workspace?: "coding" | "automation"
) {
  const conditions = [eq(agentTasks.userId, userId)];
  if (workspace) {
    conditions.push(eq(agentTasks.workspace, workspace));
  }
  return db.query.agentTasks.findMany({
    where: and(...conditions),
    orderBy: [desc(agentTasks.updatedAt)],
  });
}

export async function getTaskForUser(taskId: string, userId: string) {
  return db.query.agentTasks.findFirst({
    where: and(eq(agentTasks.id, taskId), eq(agentTasks.userId, userId)),
  });
}

// ---------------------------------------------------------------------------
// Workflows
// ---------------------------------------------------------------------------

export async function listWorkflowsForUser(userId: string) {
  return db.query.workflows.findMany({
    where: eq(workflows.userId, userId),
    orderBy: [desc(workflows.updatedAt)],
  });
}

export async function getWorkflowForUser(workflowId: string, userId: string) {
  return db.query.workflows.findFirst({
    where: and(eq(workflows.id, workflowId), eq(workflows.userId, userId)),
    with: {
      versions: true,
      executions: {
        orderBy: (e, { desc: d }) => [d(e.createdAt)],
        limit: 20,
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Credit account (read-only for now)
// ---------------------------------------------------------------------------

export async function getCreditAccountForUser(userId: string) {
  return db.query.creditAccounts.findFirst({
    where: eq(creditAccounts.userId, userId),
  });
}
