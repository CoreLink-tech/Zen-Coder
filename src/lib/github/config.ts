/**
 * GitHub App configuration.
 *
 * The product owner registers the GitHub App and supplies these env vars.
 * Until configured, GitHub features show a clear "not configured" state.
 */

export function isGitHubAppConfigured(): boolean {
  return Boolean(
    process.env.GITHUB_APP_ID &&
      process.env.GITHUB_APP_PRIVATE_KEY &&
      process.env.GITHUB_APP_CLIENT_ID &&
      process.env.GITHUB_APP_CLIENT_SECRET
  );
}

export function getGitHubAppConfig() {
  const appId = process.env.GITHUB_APP_ID;
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const clientId = process.env.GITHUB_APP_CLIENT_ID;
  const clientSecret = process.env.GITHUB_APP_CLIENT_SECRET;
  const webhookSecret = process.env.GITHUB_APP_WEBHOOK_SECRET;

  if (!appId || !privateKey || !clientId || !clientSecret) {
    return null;
  }

  return {
    appId,
    privateKey,
    clientId,
    clientSecret,
    webhookSecret,
  };
}

/** URL users visit to install the GitHub App on their account/org */
export function getGitHubAppInstallUrl(): string | null {
  const slug = process.env.GITHUB_APP_SLUG;
  if (!slug) return null;
  return `https://github.com/apps/${slug}/installations/new`;
}
