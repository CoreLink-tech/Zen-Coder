import { getAccountSummary } from "@/lib/credits/ledger";
import { getCurrentUser } from "@/lib/auth/session";

export async function CreditBalance() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return (
        <div className="text-xs text-muted-foreground">Credits —</div>
      );
    }
    const summary = await getAccountSummary(user.id);
    return (
      <div className="rounded-md bg-muted/60 px-2.5 py-1.5 text-xs text-muted-foreground sm:px-3 sm:py-2">
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
  } catch {
    return (
      <div className="rounded-md bg-muted/60 px-2.5 py-1.5 text-xs text-muted-foreground">
        <div className="font-medium text-foreground">Credits</div>
        <div className="mt-0.5">—</div>
      </div>
    );
  }
}
