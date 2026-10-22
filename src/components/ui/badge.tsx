import type { HTMLAttributes } from "react";

export type BadgeTone = "neutral" | "primary" | "success" | "warning" | "destructive";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-muted text-muted-foreground ring-border",
  primary: "bg-primary-soft text-primary ring-primary/20",
  success: "bg-success-soft text-success ring-success/20",
  warning: "bg-warning-soft text-warning ring-warning/20",
  destructive: "bg-destructive-soft text-destructive ring-destructive/20",
};

export function Badge({
  tone = "neutral",
  className = "",
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${tones[tone]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}

/** Maps a workflow or execution status string to a badge tone. */
export function statusTone(status: string): BadgeTone {
  switch (status) {
    case "active":
    case "succeeded":
    case "success":
    case "completed":
      return "success";
    case "running":
    case "pending":
    case "queued":
      return "primary";
    case "paused":
    case "awaiting_approval":
      return "warning";
    case "failed":
    case "error":
    case "disabled":
      return "destructive";
    default:
      return "neutral";
  }
}
