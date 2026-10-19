"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";

const navItems = [
  {
    label: "Coding",
    href: "/coding",
    description: "AI coding agent & repositories",
  },
  {
    label: "Automation",
    href: "/automation",
    description: "Workflows & scheduled tasks",
  },
  {
    label: "Settings",
    href: "/settings",
    description: "Account, models & billing",
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      <div className="flex h-14 items-center border-b border-border px-4">
        <Link
          href="/coding"
          className="flex items-center gap-2 font-semibold tracking-tight"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
            Z
          </span>
          <span>Zen-Coder</span>
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-md px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <div className="font-medium">{item.label}</div>
              <div className="mt-0.5 text-xs opacity-70">{item.description}</div>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        <form action={logoutAction}>
          <Button type="submit" variant="ghost" size="sm" className="w-full">
            Sign out
          </Button>
        </form>
      </div>
    </>
  );
}
