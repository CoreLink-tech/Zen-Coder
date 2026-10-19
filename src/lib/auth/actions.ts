"use server";

import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { AuthError } from "next-auth";

import { signIn, signOut } from "@/lib/auth";
import { db } from "@/lib/db";
import { createUser, getUserByEmail } from "@/lib/db/queries";
import { users } from "@/lib/db/schema";

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

export async function registerAction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
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

  try {
    await createUser({
      email,
      name: parsed.data.name?.trim() || null,
      passwordHash,
      role: "user",
      status: "active",
    });
  } catch {
    return { error: "Could not create account. Please try again." };
  }

  // Auto sign-in after registration
  try {
    await signIn("credentials", {
      email,
      password: parsed.data.password,
      redirectTo: "/coding",
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "Account created, but sign-in failed. Please log in." };
    }
    throw err; // Next.js redirect throws
  }

  return { success: true };
}

export async function loginAction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Invalid email or password" };
  }

  const email = parsed.data.email.toLowerCase().trim();

  // Soft check for inactive accounts (authorize already rejects them)
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
    columns: { status: true },
  });
  if (user && user.status !== "active") {
    return { error: "This account is not active" };
  }

  try {
    await signIn("credentials", {
      email,
      password: parsed.data.password,
      redirectTo: "/coding",
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "Invalid email or password" };
    }
    throw err;
  }

  return { success: true };
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
