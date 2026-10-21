/**
 * Zen-Coder database schema (Drizzle + Turso/libSQL)
 *
 * Phase 2 focuses on core ownership, projects, conversations,
 * tasks, and workflow skeletons. Billing tables are included
 * as stubs so Phase 8 can extend them without migration churn.
 */

import { relations, sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
};

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export const users = sqliteTable(
  "users",
  {
    id: id(),
    email: text("email").notNull(),
    name: text("name"),
    image: text("image"),
    emailVerified: integer("email_verified", { mode: "timestamp_ms" }),
    // Credentials provider (hashed with bcrypt)
    passwordHash: text("password_hash"),
    role: text("role", { enum: ["user", "admin"] })
      .notNull()
      .default("user"),
    status: text("status", { enum: ["active", "suspended", "deleted"] })
      .notNull()
      .default("active"),
    ...timestamps,
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email)]
);

export const usersRelations = relations(users, ({ many, one }) => ({
  projects: many(projects),
  conversations: many(conversations),
  workflows: many(workflows),
  creditAccount: one(creditAccounts),
  accounts: many(accounts),
  sessions: many(sessions),
}));

// ---------------------------------------------------------------------------
// Auth.js tables (accounts, sessions, verification tokens)
// ---------------------------------------------------------------------------

export const accounts = sqliteTable(
  "accounts",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [
    uniqueIndex("accounts_provider_provider_account_id_idx").on(
      t.provider,
      t.providerAccountId
    ),
    index("accounts_user_id_idx").on(t.userId),
  ]
);

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const sessions = sqliteTable(
  "sessions",
  {
    id: id(),
    sessionToken: text("session_token").notNull().unique(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [index("sessions_user_id_idx").on(t.userId)]
);

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const verificationTokens = sqliteTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [
    uniqueIndex("verification_tokens_identifier_token_idx").on(
      t.identifier,
      t.token
    ),
  ]
);

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export const projects = sqliteTable(
  "projects",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    workspace: text("workspace", { enum: ["coding", "automation", "shared"] })
      .notNull()
      .default("coding"),
    ...timestamps,
  },
  (t) => [
    index("projects_user_id_idx").on(t.userId),
  ]
);

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, {
    fields: [projects.userId],
    references: [users.id],
  }),
  repositories: many(repositories),
  conversations: many(conversations),
}));

// ---------------------------------------------------------------------------
// GitHub App installations
// ---------------------------------------------------------------------------

export const githubInstallations = sqliteTable(
  "github_installations",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    installationId: text("installation_id").notNull(),
    accountLogin: text("account_login"),
    accountType: text("account_type"), // User | Organization
    permissions: text("permissions"), // JSON snapshot
    suspended: integer("suspended", { mode: "boolean" }).default(false),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("github_installations_installation_id_idx").on(t.installationId),
    index("github_installations_user_id_idx").on(t.userId),
  ]
);

export const githubInstallationsRelations = relations(
  githubInstallations,
  ({ one, many }) => ({
    user: one(users, {
      fields: [githubInstallations.userId],
      references: [users.id],
    }),
    repositories: many(repositories),
  })
);

// ---------------------------------------------------------------------------
// Repositories (GitHub connection metadata)
// ---------------------------------------------------------------------------

export const repositories = sqliteTable(
  "repositories",
  {
    id: id(),
    projectId: text("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    githubRepoId: integer("github_repo_id"),
    fullName: text("full_name").notNull(), // owner/repo
    defaultBranch: text("default_branch").default("main"),
    installationId: text("installation_id"),
    private: integer("private", { mode: "boolean" }).default(true),
    ...timestamps,
  },
  (t) => [
    index("repositories_user_id_idx").on(t.userId),
    index("repositories_project_id_idx").on(t.projectId),
    uniqueIndex("repositories_user_full_name_idx").on(t.userId, t.fullName),
  ]
);

export const repositoriesRelations = relations(repositories, ({ one }) => ({
  project: one(projects, {
    fields: [repositories.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [repositories.userId],
    references: [users.id],
  }),
}));

// ---------------------------------------------------------------------------
// Conversations & Messages
// ---------------------------------------------------------------------------

export const conversations = sqliteTable(
  "conversations",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    projectId: text("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    workspace: text("workspace", { enum: ["coding", "automation"] })
      .notNull()
      .default("coding"),
    title: text("title"),
    status: text("status", {
      enum: ["active", "archived", "deleted"],
    })
      .notNull()
      .default("active"),
    ...timestamps,
  },
  (t) => [
    index("conversations_user_id_idx").on(t.userId),
    index("conversations_project_id_idx").on(t.projectId),
  ]
);

export const conversationsRelations = relations(
  conversations,
  ({ one, many }) => ({
    user: one(users, {
      fields: [conversations.userId],
      references: [users.id],
    }),
    project: one(projects, {
      fields: [conversations.projectId],
      references: [projects.id],
    }),
    messages: many(messages),
    tasks: many(agentTasks),
  })
);

export const messages = sqliteTable(
  "messages",
  {
    id: id(),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    role: text("role", {
      enum: ["user", "assistant", "system", "tool"],
    }).notNull(),
    content: text("content").notNull(),
    // Structured tool call / result payloads (JSON string)
    metadata: text("metadata"),
    ...timestamps,
  },
  (t) => [index("messages_conversation_id_idx").on(t.conversationId)]
);

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));

// ---------------------------------------------------------------------------
// Agent Tasks
// ---------------------------------------------------------------------------

export const agentTasks = sqliteTable(
  "agent_tasks",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    conversationId: text("conversation_id").references(
      () => conversations.id,
      { onDelete: "set null" }
    ),
    projectId: text("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    workspace: text("workspace", { enum: ["coding", "automation"] })
      .notNull()
      .default("coding"),
    title: text("title").notNull(),
    status: text("status", {
      enum: [
        "pending",
        "planning",
        "running",
        "awaiting_approval",
        "completed",
        "failed",
        "cancelled",
      ],
    })
      .notNull()
      .default("pending"),
    // High-level plan / summary (JSON or markdown)
    plan: text("plan"),
    result: text("result"),
    error: text("error"),
    // Estimated vs actual credit usage (filled later)
    estimatedCredits: integer("estimated_credits"),
    actualCredits: integer("actual_credits"),
    ...timestamps,
  },
  (t) => [
    index("agent_tasks_user_id_idx").on(t.userId),
    index("agent_tasks_conversation_id_idx").on(t.conversationId),
    index("agent_tasks_status_idx").on(t.status),
  ]
);

export const agentTasksRelations = relations(agentTasks, ({ one }) => ({
  user: one(users, {
    fields: [agentTasks.userId],
    references: [users.id],
  }),
  conversation: one(conversations, {
    fields: [agentTasks.conversationId],
    references: [conversations.id],
  }),
  project: one(projects, {
    fields: [agentTasks.projectId],
    references: [projects.id],
  }),
}));

// ---------------------------------------------------------------------------
// Proposed code changes (awaiting user approval before write)
// ---------------------------------------------------------------------------

export const proposedChanges = sqliteTable(
  "proposed_changes",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    conversationId: text("conversation_id").references(() => conversations.id, {
      onDelete: "set null",
    }),
    taskId: text("task_id").references(() => agentTasks.id, {
      onDelete: "set null",
    }),
    repositoryId: text("repository_id").references(() => repositories.id, {
      onDelete: "cascade",
    }),
    fullName: text("full_name").notNull(), // owner/repo
    branch: text("branch").notNull(),
    baseSha: text("base_sha"),
    // JSON array of { path, action: create|update|delete, content?, previousContent?, message? }
    files: text("files").notNull(),
    commitMessage: text("commit_message"),
    status: text("status", {
      enum: ["pending", "approved", "rejected", "applied", "failed"],
    })
      .notNull()
      .default("pending"),
    result: text("result"), // JSON: commit sha, pr url, error, etc.
    ...timestamps,
  },
  (t) => [
    index("proposed_changes_user_id_idx").on(t.userId),
    index("proposed_changes_status_idx").on(t.status),
    index("proposed_changes_conversation_id_idx").on(t.conversationId),
  ]
);

export const proposedChangesRelations = relations(
  proposedChanges,
  ({ one }) => ({
    user: one(users, {
      fields: [proposedChanges.userId],
      references: [users.id],
    }),
    conversation: one(conversations, {
      fields: [proposedChanges.conversationId],
      references: [conversations.id],
    }),
    task: one(agentTasks, {
      fields: [proposedChanges.taskId],
      references: [agentTasks.id],
    }),
    repository: one(repositories, {
      fields: [proposedChanges.repositoryId],
      references: [repositories.id],
    }),
  })
);

// ---------------------------------------------------------------------------
// Workflows (Automation)
// ---------------------------------------------------------------------------

export const workflows = sqliteTable(
  "workflows",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    projectId: text("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    description: text("description"),
    status: text("status", {
      enum: ["draft", "active", "paused", "disabled", "archived"],
    })
      .notNull()
      .default("draft"),
    // Current published version id (nullable until first publish)
    currentVersionId: text("current_version_id"),
    /** Optional secret for inbound webhook trigger */
    webhookSecret: text("webhook_secret"),
    ...timestamps,
  },
  (t) => [
    index("workflows_user_id_idx").on(t.userId),
    index("workflows_status_idx").on(t.status),
  ]
);

export const workflowsRelations = relations(workflows, ({ one, many }) => ({
  user: one(users, {
    fields: [workflows.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [workflows.projectId],
    references: [projects.id],
  }),
  versions: many(workflowVersions),
  executions: many(workflowExecutions),
  schedules: many(workflowSchedules),
}));

// ---------------------------------------------------------------------------
// Workflow schedules
// ---------------------------------------------------------------------------

export const workflowSchedules = sqliteTable(
  "workflow_schedules",
  {
    id: id(),
    workflowId: text("workflow_id")
      .notNull()
      .references(() => workflows.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** interval | cron */
    type: text("type", { enum: ["interval", "cron"] }).notNull(),
    /** For interval: minutes between runs. For cron: 5-field expression */
    expression: text("expression").notNull(),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
    /** Prevent concurrent runs of the same workflow */
    preventOverlap: integer("prevent_overlap", { mode: "boolean" })
      .notNull()
      .default(true),
    lastRunAt: integer("last_run_at", { mode: "timestamp" }),
    nextRunAt: integer("next_run_at", { mode: "timestamp" }),
    ...timestamps,
  },
  (t) => [
    index("workflow_schedules_workflow_id_idx").on(t.workflowId),
    index("workflow_schedules_next_run_at_idx").on(t.nextRunAt),
    index("workflow_schedules_user_id_idx").on(t.userId),
  ]
);

export const workflowSchedulesRelations = relations(
  workflowSchedules,
  ({ one }) => ({
    workflow: one(workflows, {
      fields: [workflowSchedules.workflowId],
      references: [workflows.id],
    }),
    user: one(users, {
      fields: [workflowSchedules.userId],
      references: [users.id],
    }),
  })
);

// ---------------------------------------------------------------------------
// Background jobs (durable queue for scheduled / deferred work)
// ---------------------------------------------------------------------------

export const backgroundJobs = sqliteTable(
  "background_jobs",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type", {
      enum: ["workflow_run", "generic"],
    })
      .notNull()
      .default("workflow_run"),
    payload: text("payload").notNull(), // JSON
    status: text("status", {
      enum: ["pending", "running", "succeeded", "failed", "cancelled"],
    })
      .notNull()
      .default("pending"),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(3),
    runAt: integer("run_at", { mode: "timestamp" }).notNull(),
    lockedAt: integer("locked_at", { mode: "timestamp" }),
    error: text("error"),
    result: text("result"), // JSON
    ...timestamps,
  },
  (t) => [
    index("background_jobs_status_run_at_idx").on(t.status, t.runAt),
    index("background_jobs_user_id_idx").on(t.userId),
  ]
);

export const workflowVersions = sqliteTable(
  "workflow_versions",
  {
    id: id(),
    workflowId: text("workflow_id")
      .notNull()
      .references(() => workflows.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    // Structured definition: steps, tools, conditions (JSON)
    definition: text("definition").notNull(),
    // Human-readable summary produced by the agent
    summary: text("summary"),
    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (t) => [
    index("workflow_versions_workflow_id_idx").on(t.workflowId),
    uniqueIndex("workflow_versions_workflow_version_idx").on(
      t.workflowId,
      t.version
    ),
  ]
);

export const workflowVersionsRelations = relations(
  workflowVersions,
  ({ one }) => ({
    workflow: one(workflows, {
      fields: [workflowVersions.workflowId],
      references: [workflows.id],
    }),
  })
);

export const workflowExecutions = sqliteTable(
  "workflow_executions",
  {
    id: id(),
    workflowId: text("workflow_id")
      .notNull()
      .references(() => workflows.id, { onDelete: "cascade" }),
    workflowVersionId: text("workflow_version_id")
      .notNull()
      .references(() => workflowVersions.id, { onDelete: "restrict" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: text("status", {
      enum: [
        "queued",
        "running",
        "succeeded",
        "failed",
        "cancelled",
        "timed_out",
      ],
    })
      .notNull()
      .default("queued"),
    trigger: text("trigger", {
      enum: ["manual", "schedule", "webhook", "event"],
    })
      .notNull()
      .default("manual"),
    startedAt: integer("started_at", { mode: "timestamp_ms" }),
    finishedAt: integer("finished_at", { mode: "timestamp_ms" }),
    error: text("error"),
    // Step-level logs stored as JSON for now (can move to object storage later)
    logs: text("logs"),
    creditsUsed: integer("credits_used"),
    ...timestamps,
  },
  (t) => [
    index("workflow_executions_workflow_id_idx").on(t.workflowId),
    index("workflow_executions_user_id_idx").on(t.userId),
    index("workflow_executions_status_idx").on(t.status),
  ]
);

export const workflowExecutionsRelations = relations(
  workflowExecutions,
  ({ one }) => ({
    workflow: one(workflows, {
      fields: [workflowExecutions.workflowId],
      references: [workflows.id],
    }),
    version: one(workflowVersions, {
      fields: [workflowExecutions.workflowVersionId],
      references: [workflowVersions.id],
    }),
    user: one(users, {
      fields: [workflowExecutions.userId],
      references: [users.id],
    }),
  })
);

// ---------------------------------------------------------------------------
// Credit accounting (stubs for Phase 8)
// ---------------------------------------------------------------------------

export const creditAccounts = sqliteTable(
  "credit_accounts",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // Balance in internal credit units (integer for safety)
    balance: integer("balance").notNull().default(0),
    // Reserved / held for in-flight operations
    reserved: integer("reserved").notNull().default(0),
    ...timestamps,
  },
  (t) => [uniqueIndex("credit_accounts_user_id_idx").on(t.userId)]
);

export const creditAccountsRelations = relations(
  creditAccounts,
  ({ one, many }) => ({
    user: one(users, {
      fields: [creditAccounts.userId],
      references: [users.id],
    }),
    ledgerEntries: many(creditLedgerEntries),
  })
);

export const creditLedgerEntries = sqliteTable(
  "credit_ledger_entries",
  {
    id: id(),
    accountId: text("account_id")
      .notNull()
      .references(() => creditAccounts.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // Positive = credit, negative = debit
    amount: integer("amount").notNull(),
    type: text("type", {
      enum: [
        "grant",
        "purchase",
        "usage",
        "refund",
        "adjustment",
        "reservation",
        "release",
        "reconciliation",
      ],
    }).notNull(),
    // Idempotency key for the operation that produced this entry
    operationId: text("operation_id").notNull(),
    reason: text("reason"),
    // Optional links
    taskId: text("task_id"),
    workflowExecutionId: text("workflow_execution_id"),
    provider: text("provider"),
    model: text("model"),
    metadata: text("metadata"), // JSON
    ...timestamps,
  },
  (t) => [
    index("credit_ledger_account_id_idx").on(t.accountId),
    index("credit_ledger_user_id_idx").on(t.userId),
    uniqueIndex("credit_ledger_operation_id_idx").on(t.operationId),
  ]
);

export const creditLedgerEntriesRelations = relations(
  creditLedgerEntries,
  ({ one }) => ({
    account: one(creditAccounts, {
      fields: [creditLedgerEntries.accountId],
      references: [creditAccounts.id],
    }),
    user: one(users, {
      fields: [creditLedgerEntries.userId],
      references: [users.id],
    }),
  })
);

// ---------------------------------------------------------------------------
// Subscriptions (Stripe-backed)
// ---------------------------------------------------------------------------

export const subscriptions = sqliteTable(
  "subscriptions",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    planId: text("plan_id").notNull(), // free | starter | pro
    status: text("status", {
      enum: [
        "active",
        "canceled",
        "past_due",
        "incomplete",
        "trialing",
        "unpaid",
      ],
    })
      .notNull()
      .default("active"),
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    stripePriceId: text("stripe_price_id"),
    currentPeriodEnd: integer("current_period_end", { mode: "timestamp" }),
    cancelAtPeriodEnd: integer("cancel_at_period_end", { mode: "boolean" }).default(false),
    ...timestamps,
  },
  (t) => [
    index("subscriptions_user_id_idx").on(t.userId),
    uniqueIndex("subscriptions_stripe_subscription_id_idx").on(t.stripeSubscriptionId),
  ]
);

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id],
  }),
}));


// ---------------------------------------------------------------------------
// Architecture plans (System Architect — approval before heavy implementation)
// ---------------------------------------------------------------------------

export const architecturePlans = sqliteTable(
  "architecture_plans",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    conversationId: text("conversation_id").references(() => conversations.id, {
      onDelete: "set null",
    }),
    taskId: text("task_id").references(() => agentTasks.id, {
      onDelete: "set null",
    }),
    projectId: text("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    // lightweight | full
    mode: text("mode", { enum: ["lightweight", "full"] })
      .notNull()
      .default("lightweight"),
    // JSON structured plan body
    content: text("content").notNull(),
    status: text("status", {
      enum: ["draft", "pending_approval", "approved", "rejected", "superseded"],
    })
      .notNull()
      .default("pending_approval"),
    userFeedback: text("user_feedback"),
    model: text("model"),
    provider: text("provider"),
    creditsUsed: integer("credits_used"),
    ...timestamps,
  },
  (t) => [
    index("architecture_plans_user_id_idx").on(t.userId),
    index("architecture_plans_conversation_id_idx").on(t.conversationId),
    index("architecture_plans_status_idx").on(t.status),
  ]
);

export const architecturePlansRelations = relations(
  architecturePlans,
  ({ one }) => ({
    user: one(users, {
      fields: [architecturePlans.userId],
      references: [users.id],
    }),
    conversation: one(conversations, {
      fields: [architecturePlans.conversationId],
      references: [conversations.id],
    }),
  })
);

// ---------------------------------------------------------------------------
// Multi-Model Debugger runs (opt-in only after coding completion)
// ---------------------------------------------------------------------------

export const debuggerRuns = sqliteTable(
  "debugger_runs",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    conversationId: text("conversation_id").references(() => conversations.id, {
      onDelete: "set null",
    }),
    taskId: text("task_id").references(() => agentTasks.id, {
      onDelete: "set null",
    }),
    status: text("status", {
      enum: [
        "offered",
        "declined",
        "running",
        "completed",
        "failed",
        "cancelled",
      ],
    })
      .notNull()
      .default("offered"),
    // JSON findings
    findings: text("findings"),
    modelsUsed: text("models_used"), // JSON array
    creditsUsed: integer("credits_used"),
    error: text("error"),
    ...timestamps,
  },
  (t) => [
    index("debugger_runs_user_id_idx").on(t.userId),
    index("debugger_runs_task_id_idx").on(t.taskId),
  ]
);

export const debuggerRunsRelations = relations(debuggerRuns, ({ one }) => ({
  user: one(users, {
    fields: [debuggerRuns.userId],
    references: [users.id],
  }),
}));

// ---------------------------------------------------------------------------
// Type exports
// ---------------------------------------------------------------------------

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type GitHubInstallation = typeof githubInstallations.$inferSelect;
export type Repository = typeof repositories.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type AgentTask = typeof agentTasks.$inferSelect;
export type ProposedChange = typeof proposedChanges.$inferSelect;
export type Workflow = typeof workflows.$inferSelect;
export type WorkflowVersion = typeof workflowVersions.$inferSelect;
export type WorkflowExecution = typeof workflowExecutions.$inferSelect;
export type WorkflowSchedule = typeof workflowSchedules.$inferSelect;
export type BackgroundJob = typeof backgroundJobs.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type ArchitecturePlan = typeof architecturePlans.$inferSelect;
export type DebuggerRun = typeof debuggerRuns.$inferSelect;
export type CreditAccount = typeof creditAccounts.$inferSelect;
export type CreditLedgerEntry = typeof creditLedgerEntries.$inferSelect;
