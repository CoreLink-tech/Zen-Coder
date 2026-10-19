import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  agentTasks,
  creditAccounts,
  creditLedgerEntries,
  users,
  workflowExecutions,
  workflows,
} from "@/lib/db/schema";

export async function listUsersAdmin(limit = 50) {
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      status: users.status,
      createdAt: users.createdAt,
      balance: creditAccounts.balance,
      reserved: creditAccounts.reserved,
    })
    .from(users)
    .leftJoin(creditAccounts, eq(creditAccounts.userId, users.id))
    .orderBy(desc(users.createdAt))
    .limit(limit);
  return rows;
}

export async function getUsageOverview() {
  const [taskStats] = await db
    .select({
      total: sql<number>`count(*)`,
      failed: sql<number>`sum(case when ${agentTasks.status} = 'failed' then 1 else 0 end)`,
      completed: sql<number>`sum(case when ${agentTasks.status} = 'completed' then 1 else 0 end)`,
    })
    .from(agentTasks);

  const [execStats] = await db
    .select({
      total: sql<number>`count(*)`,
      failed: sql<number>`sum(case when ${workflowExecutions.status} = 'failed' then 1 else 0 end)`,
      succeeded: sql<number>`sum(case when ${workflowExecutions.status} = 'succeeded' then 1 else 0 end)`,
    })
    .from(workflowExecutions);

  const [creditStats] = await db
    .select({
      totalBalance: sql<number>`coalesce(sum(${creditAccounts.balance}), 0)`,
      usersWithAccounts: sql<number>`count(*)`,
    })
    .from(creditAccounts);

  const recentUsage = await db.query.creditLedgerEntries.findMany({
    where: eq(creditLedgerEntries.type, "usage"),
    orderBy: [desc(creditLedgerEntries.createdAt)],
    limit: 30,
  });

  return {
    tasks: {
      total: Number(taskStats?.total ?? 0),
      failed: Number(taskStats?.failed ?? 0),
      completed: Number(taskStats?.completed ?? 0),
    },
    executions: {
      total: Number(execStats?.total ?? 0),
      failed: Number(execStats?.failed ?? 0),
      succeeded: Number(execStats?.succeeded ?? 0),
    },
    credits: {
      totalBalance: Number(creditStats?.totalBalance ?? 0),
      accounts: Number(creditStats?.usersWithAccounts ?? 0),
    },
    recentUsage,
  };
}

export async function listRecentFailures(limit = 40) {
  const tasks = await db.query.agentTasks.findMany({
    where: eq(agentTasks.status, "failed"),
    orderBy: [desc(agentTasks.updatedAt)],
    limit,
  });

  const executions = await db.query.workflowExecutions.findMany({
    where: eq(workflowExecutions.status, "failed"),
    orderBy: [desc(workflowExecutions.updatedAt)],
    limit,
  });

  return { tasks, executions };
}

export async function getPlatformCounts() {
  const [u] = await db.select({ c: sql<number>`count(*)` }).from(users);
  const [w] = await db.select({ c: sql<number>`count(*)` }).from(workflows);
  const [t] = await db.select({ c: sql<number>`count(*)` }).from(agentTasks);
  return {
    users: Number(u?.c ?? 0),
    workflows: Number(w?.c ?? 0),
    tasks: Number(t?.c ?? 0),
  };
}
