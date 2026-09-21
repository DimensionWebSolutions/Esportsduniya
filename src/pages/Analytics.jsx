import { useState } from 'react';
import { useLeaderboard, usePublicStats } from '@/hooks/useLiveScores';
import { DashboardLayout } from '@/layouts/PageLayouts';
import { StatTile } from '@/ui/section';
import { DataTable } from '@/ui/table';
import { Skeleton } from '@/ui/section';
import { DonutChart, BarChart, RadarChart, Sparkline } from '@/components/AnalyticsCharts';
import { Card, CardContent } from '@/ui/card';
import { Button } from '@/ui/button';
import { TrendingUp, Users, Zap, Award, Activity, BarChart2 } from 'lucide-react';

const SPORT_SEGMENTS = [
  { label: 'Cricket', value: 45, color: '#22c55e' },
  { label: 'Football', value: 30, color: '#3b82f6' },
  { label: 'NBA', value: 12, color: '#f97316' },
  { label: 'Tennis', value: 8, color: '#eab308' },
  { label: 'F1', value: 5, color: '#ef4444' },
];

const WEEKLY_ACTIVITY = [
  { label: 'Mon', a: 64, b: 42 },
  { label: 'Tue', a: 78, b: 55 },
  { label: 'Wed', a: 95, b: 72 },
  { label: 'Thu', a: 88, b: 68 },
  { label: 'Fri', a: 124, b: 90 },
  { label: 'Sat', a: 168, b: 135 },
  { label: 'Sun', a: 182, b: 148 },
];

const MATCH_RADAR_DATA = [
  { label: 'Attack', value: 85 },
  { label: 'Defense', value: 72 },
  { label: 'Momentum', value: 91 },
  { label: 'Crowd Energy', value: 78 },
  { label: 'Tactics', value: 65 },
  { label: 'Form', value: 88 },
];

const WIN_PROB_SPARKLINE = [48, 52, 49, 56, 62, 59, 68, 74, 71, 79, 82, 86];

export default function AnalyticsPage() {
  const [timeframe, setTimeframe] = useState('7d');
  const { data: leadData, isLoading } = useLeaderboard('alltime');
  const { data: publicStats } = usePublicStats();
  const board = leadData?.leaderboard || [];

  const columns = [
    { key: 'rank', header: '#', render: row => row.rank, className: 'font-data w-12' },
    {
      key: 'username', header: 'Fan', render: row => (
        <div className="flex items-center gap-2">
          <span>{row.avatar || '👤'}</span>
          <span className="font-medium text-foreground">{row.username}</span>
        </div>
      )
    },
    {
      key: 'fanPoints', header: 'Points', render: row => (
        <span className="font-data font-bold text-accent">{(row.fanPoints || 0).toLocaleString()}</span>
      )
    },
    {
      key: 'streak', header: 'Streak', render: row => (
        <span className="inline-flex items-center gap-1 font-data text-emerald-400">
          <Zap className="h-3 w-3" />
          {row.streak || '—'}
        </span>
      ), className: 'font-data'
    },
  ];

  return (
    <DashboardLayout
      title="Sports Intelligence & Analytics"
      description="Deep analytics on prediction volume, fan activity distributions, and global momentum."
    >
      {/* Top Stat Tiles */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Total Predictions"
          value={publicStats?.predictions ? `${(publicStats.predictions / 1000).toFixed(1)}K` : '142.8K'}
        />
        <StatTile
          label="Active Fans"
          value={publicStats?.users ? `${(publicStats.users / 1000).toFixed(1)}K` : '28.4K'}
        />
        <StatTile
          label="Platform Accuracy"
          value="74.2%"
        />
        <StatTile
          label="Peak Momentum"
          value="98 / 100"
        />
      </div>

      {/* Charts Grid */}
      <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Sport Distribution Donut */}
        <Card className="flex flex-col justify-between">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-display font-semibold text-foreground">Sport Distribution</h3>
                <p className="text-xs text-muted">Share of predictions by sport</p>
              </div>
              <Activity className="h-4 w-4 text-accent" />
            </div>

            <div className="flex items-center justify-center py-4">
              <DonutChart
                segments={SPORT_SEGMENTS}
                size={160}
                label="5"
                sublabel="Sports"
              />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              {SPORT_SEGMENTS.map(s => (
                <div key={s.label} className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-muted">{s.label}:</span>
                  <span className="font-data font-semibold text-foreground">{s.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Weekly Fan Activity Bars */}
        <Card className="flex flex-col justify-between">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-display font-semibold text-foreground">Weekly Activity</h3>
                <p className="text-xs text-muted">Prediction vol (blue) vs Active fans (cyan)</p>
              </div>
              <BarChart2 className="h-4 w-4 text-accent" />
            </div>

            <div className="h-48 pt-4 pb-2">
              <BarChart
                bars={WEEKLY_ACTIVITY}
                maxHeight={140}
                color="#00c2ff"
                secondColor="#3b82f6"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border text-xs text-muted">
              <span>Peak Day: Sunday</span>
              <span className="font-data text-emerald-400 font-semibold">+24% vs last week</span>
            </div>
          </CardContent>
        </Card>

        {/* Live Momentum Radar & Sparkline */}
        <Card className="flex flex-col justify-between">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-display font-semibold text-foreground">Match DNA Index</h3>
                <p className="text-xs text-muted">Aggregated match attribute profile</p>
              </div>
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            </div>

            <div className="flex items-center justify-center py-2">
              <RadarChart axes={MATCH_RADAR_DATA} size={150} color="#00c2ff" />
            </div>

            <div className="mt-2 pt-3 border-t border-border">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-muted">Win Probability Curve:</span>
                <span className="font-data font-semibold text-emerald-400">86% peak</span>
              </div>
              <div className="h-10 w-full overflow-hidden rounded bg-surface-2/40 px-2 py-1">
                <Sparkline data={WIN_PROB_SPARKLINE} width={240} height={32} color="#22c55e" strokeWidth={2} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leaderboard Table */}
      <div className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg font-semibold text-foreground">Top Ranked Oracle Analysts</h3>
            <p className="text-xs text-muted">Global fan leaderboard based on verified prediction streaks and accuracy</p>
          </div>
          <Award className="h-5 w-5 text-amber-400" />
        </div>

        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <DataTable columns={columns} data={board} emptyMessage="No analytics data yet." />
        )}
      </div>
    </DashboardLayout>
  );
}
