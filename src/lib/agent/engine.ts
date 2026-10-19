/**
 * Shared agent engine — planning + tool loop + synthesis.
 *
 * Used by Coding (Phase 5) and later Automation.
 * The model proposes tool calls; the server validates and executes them.
 */

import { chat, estimateCredits, type ChatMessage } from "@/lib/ai";
import { executeTool, listToolSchemas } from "@/lib/tools/registry";
import type { ToolContext } from "@/lib/tools/types";
import { DEFAULT_MODEL_ID } from "@/lib/ai/models";

export type AgentStepType =
  | "thinking"
  | "tool_call"
  | "tool_result"
  | "message"
  | "error";

export interface AgentStep {
  type: AgentStepType;
  content: string;
  toolId?: string;
  toolInput?: unknown;
  toolResult?: unknown;
  timestamp: number;
}

export interface AgentRunInput {
  userId: string;
  workspace: "coding" | "automation";
  conversationId?: string;
  taskId?: string;
  /** Full message history for context */
  messages: ChatMessage[];
  /** User's latest message (also appended to messages if not already) */
  userMessage: string;
  model?: string;
  maxToolRounds?: number;
  systemPrompt?: string;
}

export interface AgentRunResult {
  steps: AgentStep[];
  finalContent: string;
  model: string;
  provider: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  estimatedCredits: number | null;
  status: "completed" | "failed" | "max_rounds";
  error?: string;
}

const DEFAULT_CODING_SYSTEM = `You are Zen-Coder, an AI coding assistant.

You help users understand codebases, write and fix code, and plan technical work.

You have GitHub tools when the user has connected repositories:
- list_connected_repos — see which repos are linked
- get_repo_info — metadata for a repo
- list_repo_files — list files/dirs at a path
- read_repo_file — read a text file (size-limited)
- propose_file_changes — propose creates/updates/deletes (NOT applied until the user approves)

Rules:
- Be precise and honest. Do not claim code works unless you have verified it.
- When you need repository context, use the GitHub tools instead of guessing.
- Only use tools that are provided to you. Do not invent tool names.
- Prefer short, actionable answers.
- Never claim changes were committed or pushed. propose_file_changes only creates a pending proposal; the user must approve it in the UI.
- If no repos are connected, tell the user to connect one in Settings.`;

export async function runAgent(input: AgentRunInput): Promise<AgentRunResult> {
  const model = input.model ?? DEFAULT_MODEL_ID;
  const maxRounds = input.maxToolRounds ?? 5;
  const steps: AgentStep[] = [];

  const systemPrompt = input.systemPrompt ?? DEFAULT_CODING_SYSTEM;
  const toolSchemas = listToolSchemas(input.workspace);

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...input.messages.filter((m) => m.role !== "system"),
  ];

  // Ensure latest user message is present
  const last = messages[messages.length - 1];
  if (!last || last.role !== "user" || last.content !== input.userMessage) {
    messages.push({ role: "user", content: input.userMessage });
  }

  let totalInput = 0;
  let totalOutput = 0;
  let lastProvider = "unknown";
  let lastModel = model;

  const toolCtx: ToolContext = {
    userId: input.userId,
    taskId: input.taskId,
    conversationId: input.conversationId,
    workspace: input.workspace,
  };

  try {
    for (let round = 0; round < maxRounds; round++) {
      const response = await chat({
        model,
        messages,
        tools: toolSchemas.length > 0 ? toolSchemas : undefined,
        maxTokens: 4096,
      });

      lastProvider = response.provider;
      lastModel = response.model;
      totalInput += response.usage.inputTokens;
      totalOutput += response.usage.outputTokens;

      if (response.toolCalls && response.toolCalls.length > 0) {
        // Record assistant tool-call turn
        messages.push({
          role: "assistant",
          content: response.content || "",
        });

        for (const tc of response.toolCalls) {
          steps.push({
            type: "tool_call",
            content: `Calling ${tc.name}`,
            toolId: tc.name,
            toolInput: tryParse(tc.arguments),
            timestamp: Date.now(),
          });

          let parsedArgs: unknown = {};
          try {
            parsedArgs = JSON.parse(tc.arguments || "{}");
          } catch {
            parsedArgs = {};
          }

          const result = await executeTool(tc.name, parsedArgs, toolCtx);

          steps.push({
            type: "tool_result",
            content: result.success
              ? JSON.stringify(result.data)
              : result.error ?? "Tool failed",
            toolId: tc.name,
            toolResult: result,
            timestamp: Date.now(),
          });

          // Feed tool result back to the model
          messages.push({
            role: "tool",
            content: JSON.stringify(result),
            name: tc.name,
            toolCallId: tc.id,
          });
        }

        // Continue loop so the model can synthesize
        continue;
      }

      // Normal text response — done
      const finalContent = response.content || "";
      steps.push({
        type: "message",
        content: finalContent,
        timestamp: Date.now(),
      });

      messages.push({ role: "assistant", content: finalContent });

      return {
        steps,
        finalContent,
        model: lastModel,
        provider: lastProvider,
        usage: {
          inputTokens: totalInput,
          outputTokens: totalOutput,
          totalTokens: totalInput + totalOutput,
        },
        estimatedCredits: estimateCredits(lastModel, {
          inputTokens: totalInput,
          outputTokens: totalOutput,
        }),
        status: "completed",
      };
    }

    return {
      steps,
      finalContent: steps.filter((s) => s.type === "message").at(-1)?.content ?? "",
      model: lastModel,
      provider: lastProvider,
      usage: {
        inputTokens: totalInput,
        outputTokens: totalOutput,
        totalTokens: totalInput + totalOutput,
      },
      estimatedCredits: estimateCredits(lastModel, {
        inputTokens: totalInput,
        outputTokens: totalOutput,
      }),
      status: "max_rounds",
      error: `Stopped after ${maxRounds} tool rounds`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Agent failed";
    steps.push({
      type: "error",
      content: message,
      timestamp: Date.now(),
    });

    return {
      steps,
      finalContent: "",
      model: lastModel,
      provider: lastProvider,
      usage: {
        inputTokens: totalInput,
        outputTokens: totalOutput,
        totalTokens: totalInput + totalOutput,
      },
      estimatedCredits: estimateCredits(lastModel, {
        inputTokens: totalInput,
        outputTokens: totalOutput,
      }),
      status: "failed",
      error: message,
    };
  }
}

function tryParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}
