import { Sidebar } from "./sidebar";
import { CreditBalance } from "./credit-balance";

/**
 * Server wrapper so we can render the live credit balance
 * inside the otherwise client-side sidebar chrome.
 */
export function SidebarShell() {
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-card">
      <Sidebar />
      <div className="border-t border-border p-3">
        <CreditBalance />
      </div>
    </aside>
  );
}
