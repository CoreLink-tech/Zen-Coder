"use server";

import { hash } from "bcryptjs";
import { z } from "zod";
import { AuthError } from "next-auth";
import { signIn, signOut } from "@/lib/auth";

/** Next.js redirect() throws a special error — rethrow it. */
function isNextRedirect(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "digest" in err &&
    typeof (err as { digest?: unknown }).digest === "string" &&
    String((err as { digest: string }).digest).startsWith("NEXT_REDIRECT")
  );
}
import { createUser, getUserByEmail } from "@/lib/db/queries";

const registerSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().max(255),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type AuthActionState = {
  error?: string;
  success?: boolean;
};

function friendlyDbError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("TURSO_DATABASE_URL")) {
    return "Database is not configured. Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in Vercel.";
  }
  if (
    msg.includes("no such table") ||
    msg.includes("SQLITE_UNKNOWN") ||
    msg.toLowerCase().includes("table")
  ) {
    return "Database tables are missing. Run migrations against your Turso database (npm run db:push).";
  }
  if (msg.includes("AUTH_SECRET") || msg.toLowerCase().includes("secret")) {
    return "AUTH_SECRET is not configured in Vercel environment variables.";
  }
  // Avoid leaking internals in production
  if (process.env.NODE_ENV === "production") {
    return "Could not create account. Check server configuration (database and AUTH_SECRET).";
  }
  return msg || "Could not create account. Please try again.";
}

export async function registerAction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  try {
    const parsed = registerSchema.safeParse({
      name: formData.get("name") || undefined,
      email: formData.get("email"),
      password: formData.get("password"),
    });

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }

    const email = parsed.data.email.toLowerCase().trim();

    const existing = await getUserByEmail(email);
    if (existing) {
      return { error: "An account with this email already exists" };
    }

    const passwordHash = await hash(parsed.data.password, 12);

    const user = await createUser({
      email,
      name: parsed.data.name?.trim() || null,
      passwordHash,
      role: "user",
      status: "active",
    });

    try {
      const { ensureWelcomeGrant } = await import("@/lib/credits/ledger");
      await ensureWelcomeGrant(user.id);
    } catch {
      // Non-fatal: account still usable without welcome grant
    }

    try {
      await signIn("credentials", {
        email,
        password: parsed.data.password,
        redirectTo: "/coding",
      });
    } catch (err) {
      if (isNextRedirect(err)) throw err;
      if (err instanceof AuthError) {
        return {
          error: "Account created, but sign-in failed. Please log in.",
        };
      }
      throw err;
    }

    return { success: true };
  } catch (err) {
    if (isNextRedirect(err)) throw err;
    return { error: friendlyDbError(err) };
  }
}

export async function loginAction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  try {
    const parsed = loginSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    if (!parsed.success) {
      return { error: "Invalid email or password" };
    }

    const email = parsed.data.email.toLowerCase().trim();

    try {
      await signIn("credentials", {
        email,
        password: parsed.data.password,
        redirectTo: "/coding",
      });
    } catch (err) {
      if (isNextRedirect(err)) throw err;
      if (err instanceof AuthError) {
        return { error: "Invalid email or password" };
      }
      throw err;
    }

    return { success: true };
  } catch (err) {
    if (isNextRedirect(err)) throw err;
    return { error: friendlyDbError(err) };
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
