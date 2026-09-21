import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiUrl } from '@/config/apiBase';
import { DashboardLayout } from '@/layouts/PageLayouts';
import { StatTile } from '@/ui/section';
import { Card, CardContent } from '@/ui/card';
import { Skeleton } from '@/ui/section';
import { Button } from '@/ui/button';
import WorldFanMap from '@/components/WorldFanMap';
import { SPORTS } from '@/data/mockData';
import { Globe2, Flame, Users, Activity } from 'lucide-react';

export default function CrowdPulsePage() {
  const [activeSport, setActiveSport] = useState('all');

  const { data, isLoading } = useQuery({
    queryKey: ['crowdpulse'],
    queryFn: () => fetch(apiUrl('/api/crowdpulse')).then(r => r.json()),
    staleTime: 120_000,
  });

  const regions = data?.regions || [
    { name: 'Mumbai', fans: '2.3M', intensity: 95, emoji: '🇮🇳' },
    { name: 'London', fans: '1.8M', intensity: 78, emoji: '🇬🇧' },
    { name: 'Melbourne', fans: '1.1M', intensity: 65, emoji: '🇦🇺' },
    { name: 'New York', fans: '890K', intensity: 55, emoji: '🇺🇸' },
    { name: 'São Paulo', fans: '1.5M', intensity: 82, emoji: '🇧🇷' },
    { name: 'Tokyo', fans: '720K', intensity: 48, emoji: '🇯🇵' },
    { name: 'Dubai', fans: '550K', intensity: 60, emoji: '🇦🇪' },
    { name: 'Lagos', fans: '920K', intensity: 70, emoji: '🇳🇬' },
  ];

  const peakIntensity = regions.length ? Math.max(...regions.map(r => r.intensity || 0)) : 0;

  return (
    <DashboardLayout
      title="Global Crowd Pulse"
      description="Real-time heatmap of international stadium attendance, fan chatter intensity, and match energy."
    >
      {/* Stat Tiles */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatTile label="Active Hotspots" value={regions.length} />
        <StatTile label="Peak Energy Index" value={`${peakIntensity}% (Mumbai)`} />
        <StatTile label="Live Global Pulse" value="High Frequency" />
      </div>

      {/* Sport Category Filter */}
      <div className="mb-6 flex flex-wrap gap-2">
        <Button
          variant={activeSport === 'all' ? 'default' : 'secondary'}
          size="sm"
          onClick={() => setActiveSport('all')}
        >
          All Sports
        </Button>
        {SPORTS.map(s => (
          <Button
            key={s.id}
            variant={activeSport === s.id ? 'default' : 'secondary'}
            size="sm"
            onClick={() => setActiveSport(s.id)}
          >
            {s.label}
          </Button>
        ))}
      </div>

      {/* Interactive World Map */}
      <div className="mb-8">
        <WorldFanMap regions={regions} activeSport={activeSport} />
      </div>

      {/* Regional Cards Grid */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold text-foreground">Regional Stadium Energy Feed</h3>
        <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-data">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          Live WebSocket Telemetry
        </span>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {regions.map(region => (
            <Card key={region.name} className="overflow-hidden transition-all hover:border-accent/40">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-2xl">{region.emoji}</span>
                    <h4 className="mt-1 font-display font-semibold text-foreground">{region.name}</h4>
                    <p className="text-xs text-muted">{region.fans} active fans</p>
                  </div>
                  <div className="text-right">
                    <span className="font-data text-lg font-bold text-accent">{region.intensity}%</span>
                    <p className="text-[10px] text-muted">intensity</p>
                  </div>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${region.intensity}%`,
                      backgroundColor: region.intensity > 80 ? '#22c55e' : region.intensity > 60 ? '#00c2ff' : '#f97316'
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
