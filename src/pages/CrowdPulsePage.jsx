import { useQuery } from '@tanstack/react-query';
import { apiUrl } from '@/config/apiBase';
import { DashboardLayout } from '@/layouts/PageLayouts';
import { StatTile } from '@/ui/section';
import { Card, CardContent } from '@/ui/card';
import { Skeleton } from '@/ui/section';

export default function CrowdPulsePage() {
  const { data, isLoading } = useQuery({
    queryKey: ['crowdpulse'],
    queryFn: () => fetch(apiUrl('/api/crowdpulse')).then(r => r.json()),
    staleTime: 120_000,
  });

  const regions = data?.regions || [];
  const totalFans = regions.reduce((sum, r) => {
    const n = parseFloat(String(r.fans || '0').replace(/[^0-9.]/g, '')) || 0;
    return sum + n;
  }, 0);

  return (
    <DashboardLayout
      title="Crowd Pulse"
      description="Global fan activity and regional engagement intensity."
    >
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
