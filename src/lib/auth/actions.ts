"use server";

import { hash } from "bcryptjs";
import { z } from "zod";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

import { signIn, signOut } from "@/lib/auth";
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
    msg.toLowerCase().includes("no such column")
  ) {
    return "Database schema is incomplete. Contact support or re-run migrations.";
  }
  if (msg.includes("AUTH_SECRET") || msg.toLowerCase().includes("secret")) {
    return "AUTH_SECRET is not configured in Vercel environment variables.";
  }
  if (process.env.NODE_ENV === "production") {
    return "Could not complete authentication. Please try again.";
  }
  return msg || "Could not complete authentication. Please try again.";
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
    const password = parsed.data.password;

    const existing = await getUserByEmail(email);
    if (existing) {
      return { error: "An account with this email already exists" };
    }

    const passwordHash = await hash(password, 12);

    const user = await createUser({
      email,
      name: parsed.data.name?.trim() || null,
      passwordHash,
      role: "user",
      status: "active",
    });

    if (!user?.id) {
      return { error: "Could not create account. Please try again." };
    }

    try {
      const { ensureWelcomeGrant } = await import("@/lib/credits/ledger");
      await ensureWelcomeGrant(user.id);
    } catch {
      // non-fatal
    }

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      return {
        error: "Account created, but sign-in failed. Please log in.",
      };
    }
  } catch (err) {
    return { error: friendlyDbError(err) };
  }

  // Outside try so redirect is not swallowed
  redirect("/coding");
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

    const result = await signIn("credentials", {
      email,
      password: parsed.data.password,
      redirect: false,
    });

    if (result?.error) {
      return { error: "Invalid email or password" };
    }
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "Invalid email or password" };
    }
    return { error: friendlyDbError(err) };
  }

  redirect("/coding");
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
