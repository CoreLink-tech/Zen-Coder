/**
 * GitHub App installation callback.
 *
 * After the user installs the App, GitHub redirects here with
 * ?installation_id=...&setup_action=install
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { linkGitHubInstallation } from "@/lib/github/actions";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    const login = new URL("/login", req.nextUrl.origin);
    login.searchParams.set("callbackUrl", req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(login);
  }

  const installationId = req.nextUrl.searchParams.get("installation_id");
  const setupAction = req.nextUrl.searchParams.get("setup_action");

  if (!installationId || !/^\d+$/.test(installationId)) {
    return NextResponse.redirect(
      new URL("/settings?github=missing_installation", req.nextUrl.origin)
    );
  }

  // setup_action can be install | update | request (request = pending org approval)
  if (setupAction === "request") {
    return NextResponse.redirect(
      new URL("/settings?github=pending_approval", req.nextUrl.origin)
    );
  }
  if (setupAction === "install" || setupAction === "update" || !setupAction) {
    const result = await linkGitHubInstallation(installationId);
    if (!result.success) {
      return NextResponse.redirect(
        new URL("/settings?github=error", req.nextUrl.origin)
      );
    }
  }

  return NextResponse.redirect(
    new URL("/settings?github=connected", req.nextUrl.origin)
  );
}
