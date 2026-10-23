import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { PLANS } from "@/lib/billing/plans";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const FEATURES = [
  {
    title: "Coding agent",
    body: "Chat with an AI agent that reads your repo, proposes changes and explains its reasoning before anything is written.",
    tone: "sage" as const,
  },
  {
    title: "Automation workflows",
    body: "Build HTTP and log workflows, run them on demand, on a schedule, or from an inbound webhook.",
    tone: "clay" as const,
  },
  {
    title: "One credit balance",
    body: "Coding and automation draw from the same ledger, so you always see what is available and what is reserved.",
    tone: "stone" as const,
  },
];

const STEPS = [
  { n: "01", title: "Sign in", body: "Create an account with your email and start in the coding workspace." },
  { n: "02", title: "Ask or build", body: "Describe a change for the agent, or set up a workflow that runs for you." },
  { n: "03", title: "Review and ship", body: "Approve proposed changes and watch runs and credits in one place." },
];

const toneClasses = {
  sage: { icon: "bg-sage-soft text-sage", ring: "group-hover:border-sage/40" },
  clay: { icon: "bg-clay-soft text-clay", ring: "group-hover:border-clay/40" },
  stone: { icon: "bg-stone-soft text-stone", ring: "group-hover:border-stone/40" },
} as const;

function FeatureIcon({ tone }: { tone: keyof typeof toneClasses }) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, "aria-hidden": true };
  if (tone === "sage") {
    return (
      <svg {...common}>
        <path d="M8 9l-3 3 3 3M16 9l3 3-3 3M13.5 6.5l-3 11" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (tone === "clay") {
    return (
      <svg {...common}>
        <path d="M4 7h6v6H4zM14 11h6v6h-6zM10 10h4M17 11V7h-3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <ellipse cx="12" cy="6" rx="7" ry="2.5" />
      <path d="M5 6v6c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V6M5 12v6c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-6" />
    </svg>
  );
}

export default async function HomePage() {
  // Signed-in users go straight into the coding workspace (unchanged behaviour).
  const session = await auth();
  if (session?.user) {
    redirect("/coding");
  }

  const paidPlans = PLANS.filter((p) => p.id !== "free");

  return (
    <div className="relative min-h-dvh overflow-hidden bg-background">
      {/* Soft natural wash, no gloss */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[32rem] bg-[radial-gradient(60%_80%_at_50%_0%,var(--sage-soft),transparent)] animate-zc-fade-in"
      />

      <header className="relative z-10 mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground shadow-sm">
            Z
          </span>
          <span className="text-section text-foreground">Zen-Coder</span>
        </Link>
        <nav className="flex items-center gap-2">
          <Link
            href="/login"
            className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Sign in
          </Link>
          <Link href="/register" className="hidden sm:inline-flex">
            <Button variant="secondary" size="sm">
              Get started
            </Button>
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-4xl px-5 pb-16 pt-14 text-center sm:px-8 sm:pb-24 sm:pt-24">
        <Badge tone="success" className="animate-zc-fade-up">
          Coding agent and automation, one balance
        </Badge>
        <h1
          className="text-display mx-auto mt-6 max-w-3xl text-foreground animate-zc-fade-up"
          style={{ animationDelay: "80ms" }}
        >
          Ship changes with an agent that stays in your hands.
        </h1>
        <p
          className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground animate-zc-fade-up sm:text-lg"
          style={{ animationDelay: "160ms" }}
        >
          Zen-Coder pairs an AI coding agent with workflow automation. You review every change, and you see exactly what each run costs.
        </p>
        <div
          className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row animate-zc-fade-up"
          style={{ animationDelay: "240ms" }}
        >
          <Link href="/register" className="w-full sm:w-auto">
            <Button size="lg" className="w-full sm:w-auto">
              Create an account
            </Button>
          </Link>
          <Link href="/login" className="w-full sm:w-auto">
            <Button size="lg" variant="secondary" className="w-full sm:w-auto">
              Sign in
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 mx-auto max-w-6xl px-5 pb-20 sm:px-8 sm:pb-28">
        <div className="grid gap-4 md:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Card
              key={f.title}
              className={`group animate-zc-fade-up p-6 transition-[border-color,transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-overlay motion-reduce:transform-none ${toneClasses[f.tone].ring}`}
              style={{ animationDelay: `${320 + i * 90}ms` }}
            >
              <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-lg ${toneClasses[f.tone].icon}`}>
                <FeatureIcon tone={f.tone} />
              </div>
              <h2 className="text-section text-foreground">{f.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="relative z-10 mx-auto max-w-6xl px-5 pb-20 sm:px-8 sm:pb-28">
        <p className="text-label">How it works</p>
        <h2 className="mt-2 text-title text-foreground sm:text-2xl">Three steps from sign-in to shipped.</h2>
        <ol className="mt-8 grid gap-6 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li
              key={s.n}
              className="animate-zc-slide-in border-l-2 border-border-strong pl-5"
              style={{ animationDelay: `${520 + i * 100}ms` }}
            >
              <span className="font-mono text-xs text-muted-foreground">{s.n}</span>
              <h3 className="mt-1 text-section text-foreground">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Pricing teaser (from the same PLANS source as billing) */}
      <section className="relative z-10 mx-auto max-w-6xl px-5 pb-20 sm:px-8 sm:pb-28">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-label">Plans</p>
            <h2 className="mt-2 text-title text-foreground sm:text-2xl">Start free, scale when you need to.</h2>
          </div>
          <Link
            href="/settings"
            className="text-sm font-medium text-primary transition-colors hover:text-primary-hover"
          >
            Compare plans in settings
          </Link>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <Card className="p-6">
            <CardHeader className="p-0">
              <CardTitle>Free</CardTitle>
              <CardDescription>{PLANS[0].description}</CardDescription>
            </CardHeader>
            <CardContent className="p-0 pt-4">
              <ul className="space-y-2 text-sm text-muted-foreground">
                {PLANS[0].features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
          {paidPlans.map((plan) => (
            <Card key={plan.id} className="p-6">
              <CardHeader className="p-0">
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="p-0 pt-4">
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {plan.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 mx-auto max-w-6xl px-5 pb-24 sm:px-8 sm:pb-32">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card px-6 py-12 text-center shadow-card sm:px-12 sm:py-16">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_90%_at_50%_100%,var(--clay-soft),transparent)]"
          />
          <h2 className="relative text-title text-foreground sm:text-2xl">Keep the work in your hands.</h2>
          <p className="relative mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            Create an account and open the coding workspace in under a minute.
          </p>
          <div className="relative mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/register" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto">
                Get started
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span>Zen-Coder</span>
          <span>Pricing and credit terms apply. See plans in settings.</span>
        </div>
      </footer>
    </div>
  );
}
