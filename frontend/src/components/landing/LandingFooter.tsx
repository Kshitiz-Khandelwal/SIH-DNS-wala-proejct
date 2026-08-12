export function LandingFooter() {
  return (
    <footer className="py-12">
      <div className="mx-auto flex max-w-[1120px] flex-col items-start justify-between gap-4 px-6 sm:flex-row sm:items-center">
        <p className="font-display text-sm font-semibold text-muted">DNS SHIELD</p>
        <div className="flex gap-6">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted transition-colors duration-120 hover:text-text"
          >
            Repository
          </a>
          <a href="#integration" className="text-sm text-muted transition-colors duration-120 hover:text-text">
            API Docs
          </a>
        </div>
      </div>
    </footer>
  );
}
