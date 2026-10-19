import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "user" | "admin";
      status: "active" | "suspended" | "deleted";
    } & DefaultSession["user"];
  }

  interface User {
    role?: "user" | "admin";
    status?: "active" | "suspended" | "deleted";
  }
}
