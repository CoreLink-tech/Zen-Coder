import { getAccountSummary } from "@/lib/credits/ledger";
import { getCurrentUser } from "@/lib/auth/session";

type Loaded =
  | { state: "anonymous" }
  | { state: "error" }
  | { state: "ok"; available: number; reserved: number };

async function loadSummary(): Promise<Loaded> {
  try {
    const user = await getCurrentUser();
    if (!user) return { state: "anonymous" };
    const s = await getAccountSummary(user.id);
    return { state: "ok", available: s.available, reserved: s.reserved };
  } catch {
    return { state: "error" };
  }
}

export async function CreditBalance() {
  const summary = await loadSummary();
  const shell =
    "rounded-md bg-muted/60 px-2.5 py-1.5 text-xs text-muted-foreground sm:px-3 sm:py-2";

  if (summary.state === "anonymous") {
    return <div className="text-xs text-muted-foreground">Credits —</div>;
  }
  if (summary.state === "error") {
    return (
      <div className={shell}>
        <div className="font-medium text-foreground">Credits</div>
        <div className="mt-0.5">—</div>
      </div>
    );
  }
  return (
    <div className={shell}>
      <div className="font-medium text-foreground">Credits</div>
      <div className="mt-0.5">
        <span className="font-semibold text-foreground">
          {summary.available.toLocaleString()}
        </span>
        <span className="hidden sm:inline"> available</span>
        {summary.reserved > 0 && (
          <span className="text-muted-foreground">
            {" "}
            · {summary.reserved.toLocaleString()} reserved
          </span>
        )}
      </div>
    </div>
  );
}
