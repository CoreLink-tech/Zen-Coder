import { getAccountSummary } from "@/lib/credits/ledger";
import { requireUser } from "@/lib/auth/session";

export async function CreditBalance() {
  try {
    const user = await requireUser();
    const summary = await getAccountSummary(user.id);
    return (
      <div className="rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
        <div className="font-medium text-foreground">Credits</div>
        <div className="mt-0.5">
          <span className="font-semibold text-foreground">
            {summary.available.toLocaleString()}
          </span>{" "}
          available
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
      <div className="rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
        <div className="font-medium text-foreground">Credits</div>
        <div className="mt-0.5">—</div>
      </div>
    );
  }
}
