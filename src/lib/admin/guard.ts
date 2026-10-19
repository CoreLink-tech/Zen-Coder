import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") {
    redirect("/coding");
  }
  return user;
}
