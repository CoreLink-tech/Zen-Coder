/**
 * Redirect the user to the GitHub App installation page.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getGitHubAppInstallUrl,
  isGitHubAppConfigured,
} from "@/lib/github/config";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", req.nextUrl.origin));
  }

  if (!isGitHubAppConfigured()) {
    return NextResponse.redirect(
      new URL("/settings?github=not_configured", req.nextUrl.origin)
    );
  }

  const url = getGitHubAppInstallUrl();
  if (!url) {
    // Fallback: GitHub will show the app if GITHUB_APP_SLUG is missing —
    // user must set the slug. Redirect to settings with instructions.
    return NextResponse.redirect(
      new URL("/settings?github=missing_slug", req.nextUrl.origin)
    );
  }

  return NextResponse.redirect(url);
}
