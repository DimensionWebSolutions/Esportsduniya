import { Link } from 'react-router-dom';

export function MarketingLayout({ children, title, description }) {
  return (
    <div className="mx-auto max-w-3xl">
      {(title || description) && (
        <header className="mb-8 border-b border-border pb-6">
          {title && <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">{title}</h1>}
          {description && <p className="mt-2 text-muted">{description}</p>}
        </header>
      )}
      <div className="prose prose-invert max-w-none text-foreground [&_a]:text-accent [&_h2]:font-display [&_h2]:text-xl [&_p]:text-muted">
        {children}
      </div>
      <footer className="mt-12 border-t border-border pt-6 text-sm text-muted">
        <Link to="/" className="hover:text-foreground">← Back to home</Link>
      </footer>
    </div>
  );
}

export function DashboardLayout({ title, description, action, children }) {
  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-8 flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          {title && <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">{title}</h1>}
          {description && <p className="mt-2 text-muted">{description}</p>}
        </div>
        {action}
      </header>
      {children}
    </div>
  );
}
