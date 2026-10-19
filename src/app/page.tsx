import { redirect } from "next/navigation";

export default function HomePage() {
  // Temporary: send users into the Coding workspace.
  // Phase 3 will add proper authentication gating.
  redirect("/coding");
}
