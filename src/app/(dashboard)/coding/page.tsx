import { Header } from "@/components/layout/header";
import { EmptyState } from "@/components/ui/empty-state";

export default function CodingPage() {
  return (
    <>
      <Header
        title="Coding"
        description="AI coding agent, repositories, and tasks"
      />
      <div className="flex flex-1 flex-col overflow-auto p-6">
        <EmptyState
          title="No projects yet"
          description="Connect a GitHub repository or start a new coding conversation. Full agent capabilities arrive in later phases."
          actionLabel="Coming soon"
        />
      </div>
    </>
  );
}
