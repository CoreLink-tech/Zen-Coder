export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="mb-8 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
          Z
        </span>
        <span className="text-xl font-semibold tracking-tight">Zen-Coder</span>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
