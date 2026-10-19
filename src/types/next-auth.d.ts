import { DefaultSession } from "next-auth";
import { JWT as DefaultJWT } from "next-auth/jwt";

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

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id?: string;
    role?: "user" | "admin";
    status?: "active" | "suspended" | "deleted";
  }
}
