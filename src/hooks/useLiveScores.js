import { useQuery } from '@tanstack/react-query';
import { fetchLiveMatches, getLiveScoresMeta } from '@/services/apiService';
import { apiUrl } from '@/config/apiBase';

export function useLiveScores(sport = 'all') {
  return useQuery({
    queryKey: ['live-scores', sport],
    queryFn: async () => {
      const data = await fetchLiveMatches(sport === 'all' ? 'all' : sport);
      return {
        matches: Array.isArray(data) ? data : [],
        meta: getLiveScoresMeta(),
      };
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

export function usePublicStats() {
  return useQuery({
    queryKey: ['public-stats'],
    queryFn: () => fetch(apiUrl('/api/stats/public')).then(r => r.json()),
    staleTime: 120_000,
  });
}

export function useLeaderboard(window = 'alltime') {
  return useQuery({
    queryKey: ['leaderboard', window],
    queryFn: () => fetch(apiUrl(`/api/leaderboard?window=${window}`)).then(r => r.json()),
    staleTime: 60_000,
  });
}

export function useTrending() {
  return useQuery({
    queryKey: ['trending'],
    queryFn: () => fetch(apiUrl('/api/trending')).then(r => r.json()).then(d => d.trending || []),
    staleTime: 120_000,
  });
}

export function useHeadlines(limit = 6) {
  return useQuery({
    queryKey: ['headlines', limit],
    queryFn: () => fetch(apiUrl(`/api/blog?limit=${limit}`)).then(r => r.json()).then(d => Array.isArray(d) ? d : []),
    staleTime: 300_000,
  });
}

export function useStandings(sport = 'football') {
  return useQuery({
    queryKey: ['standings', sport],
    queryFn: () => fetch(apiUrl(`/api/sports/standings/${sport}`)).then(r => r.json()),
    staleTime: 300_000,
  });
}
