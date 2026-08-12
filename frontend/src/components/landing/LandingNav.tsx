import Link from "next/link";

export function LandingNav() {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-[1120px] items-center justify-between px-6 py-4">
        <Link href="/" className="font-display text-lg font-bold tracking-tight text-text">
          DNS SHIELD
        </Link>
        <nav className="flex items-center gap-6">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted transition-colors duration-120 hover:text-text"
          >
            GitHub
          </a>
          <a
            href="#integration"
            className="text-sm text-muted transition-colors duration-120 hover:text-text"
          >
            Docs
          </a>
          <Link
            href="/login"
            className="rounded-lg bg-trace px-4 py-2 text-sm font-medium text-ink transition-opacity duration-120 hover:opacity-90"
          >
            Go to Dashboard
          </Link>
        </nav>
      </div>
    </header>
  );
}
