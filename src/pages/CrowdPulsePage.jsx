import { useQuery } from '@tanstack/react-query';
import { apiUrl } from '@/config/apiBase';
import { usePublicStats, useTrending } from '@/hooks/useLiveScores';
import { DashboardLayout } from '@/layouts/PageLayouts';
import { StatTile } from '@/ui/section';
import { Card, CardContent } from '@/ui/card';
import { Skeleton } from '@/ui/section';

const SOURCE_LABEL = {
  curated: 'Curated (no live AI key)',
  ai: 'AI estimate (Gemini + Search)',
};

export default function CrowdPulsePage() {
  const { data, isLoading } = useQuery({
    queryKey: ['crowdpulse'],
    queryFn: () => fetch(apiUrl('/api/crowdpulse')).then(r => r.json()),
    staleTime: 120_000,
  });
  const { data: socialStats } = usePublicStats();
  const { data: trending = [] } = useTrending();

  const regions = data?.regions || [];

  return (
    <DashboardLayout
      title="Crowd Pulse"
      description="Real platform activity, plus a global fan-intensity estimate."
    >
      <div className="mb-8 space-y-3">
        <h2 className="font-display text-lg font-semibold">Live on Esportsduniya</h2>
        <p className="text-sm text-muted">Real numbers from our own platform — not an estimate.</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatTile label="Fans on the platform" value={socialStats?.users?.toLocaleString() ?? '—'} />
          <StatTile label="Predictions locked" value={socialStats?.predictions?.toLocaleString() ?? '—'} />
          <StatTile label="Sports tracked" value={socialStats?.sports ?? 5} />
        </div>
        {trending.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {trending.map(t => (
              <span key={t.sport || t.label} className="rounded-full border border-border bg-surface-1 px-3 py-1 text-xs text-muted">
                {t.icon || '🔥'} {t.label || t.sport}{t.count > 0 ? ` trending · ${t.count} views` : ' trending'}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="mb-8 space-y-1 border-t border-border pt-6">
        <h2 className="font-display text-lg font-semibold">Global fan intensity</h2>
        <p className="text-sm text-muted">
          {data?.source ? SOURCE_LABEL[data.source] || data.source : 'Loading source…'} — a directional estimate of where fans are most active worldwide right now, not a measured feed.
        </p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatTile label="Regions tracked" value={regions.length} />
        <StatTile label="Data source" value={data?.source || '—'} />
        <StatTile label="Peak intensity" value={regions.length ? `${Math.max(...regions.map(r => r.intensity || 0))}%` : '—'} />
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {regions.map(region => (
            <Card key={region.name}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-2xl">{region.emoji}</p>
                    <h3 className="mt-2 font-display font-semibold">{region.name}</h3>
                    <p className="text-sm text-muted">{region.fans} fans</p>
                  </div>
                  <span className="font-data text-lg font-semibold text-accent">{region.intensity}%</span>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${region.intensity}%` }} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
