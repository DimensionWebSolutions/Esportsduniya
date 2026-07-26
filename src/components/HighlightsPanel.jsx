import { Link } from 'react-router-dom';
import { Clapperboard, ExternalLink } from 'lucide-react';
import { useHighlights } from '@/hooks/useLiveScores';
import { Section, Skeleton } from '@/ui/section';
import { SportPill } from '@/ui/badge';

export default function HighlightsPanel() {
  const { data: highlights = [], isLoading } = useHighlights(6);

  if (!isLoading && highlights.length === 0) return null;

  return (
    <Section
      title="Big moments"
      description="What happened across sports in the last day — tap through for the full story."
      action={
        <Link to="/blog" className="inline-flex items-center gap-1 text-sm text-accent hover:underline">
          All stories <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      }
      className="mb-8"
    >
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {highlights.map((h) => {
            const href = h.url || '/blog';
            const external = Boolean(h.url);
            const Tag = external ? 'a' : Link;
            const linkProps = external
              ? { href, target: '_blank', rel: 'noopener noreferrer' }
              : { to: href };
            return (
              <Tag
                key={h.id || h.title}
                {...linkProps}
                className="group block rounded-xl border border-border bg-surface-1 p-4 transition-colors hover:border-accent/40 hover:bg-surface-2"
              >
                <div className="mb-2 flex items-center gap-2">
                  <Clapperboard className="h-3.5 w-3.5 text-accent" />
                  {h.sport && h.sport !== 'general' ? (
                    <SportPill sport={h.sport} />
                  ) : (
                    <span className="text-xs uppercase tracking-wide text-muted">Sports</span>
                  )}
                </div>
                <p className="line-clamp-2 text-sm font-medium text-foreground group-hover:text-accent">
                  {h.title}
                </p>
                {h.summary && h.summary !== h.title && (
                  <p className="mt-2 line-clamp-2 text-xs text-muted">{h.summary}</p>
                )}
              </Tag>
            );
          })}
        </div>
      )}
    </Section>
  );
}
