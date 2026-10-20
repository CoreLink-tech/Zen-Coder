"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { CreditBalance } from "./credit-balance";

/**
 * Responsive shell: desktop fixed sidebar, mobile drawer.
 * CreditBalance is a server component imported via a client boundary —
 * we render it only in the drawer footer slot as children from the layout.
 */
export function SidebarShell({
  creditSlot,
}: {
  creditSlot?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar */}
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-4 lg:hidden">
        <button
          type="button"
          aria-label="Open menu"
          onClick={() => setOpen(true)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-foreground hover:bg-accent"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="font-semibold tracking-tight">Zen-Coder</span>
        <div className="ml-auto">{creditSlot}</div>
      </div>

      {/* Mobile overlay drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(18rem,85vw)] flex-col border-r border-border bg-card shadow-xl">
            <Sidebar onNavigate={() => setOpen(false)} />
            <div className="border-t border-border p-3">{creditSlot}</div>
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-card lg:flex">
        <Sidebar />
        <div className="mt-auto border-t border-border p-3">{creditSlot}</div>
      </aside>
    </>
  );
}
