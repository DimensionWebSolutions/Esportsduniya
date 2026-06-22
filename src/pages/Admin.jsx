import { useState, useEffect, useCallback } from 'react';
import { apiUrl } from '@/config/apiBase';
import { DashboardLayout } from '@/layouts/PageLayouts';
import { StatTile, Skeleton } from '@/ui/section';
import { DataTable } from '@/ui/table';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/ui/tabs';
import { Badge } from '@/ui/badge';

function authHeaders() {
  const token = localStorage.getItem('token');
  return { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) };
}

export default function AdminPanel() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const fetchAll = useCallback(async () => {
    try {
      const q = search ? `&search=${encodeURIComponent(search)}` : '';
      const [statsRes, usersRes] = await Promise.all([
        fetch(apiUrl('/api/admin/stats'), { headers: authHeaders() }),
        fetch(apiUrl(`/api/admin/users?page=1&limit=20${q}`), { headers: authHeaders() }),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(data.users || []);
      }
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const action = async (url) => {
    try {
      const res = await fetch(apiUrl(url), { method: 'POST', headers: authHeaders() });
      const data = await res.json();
      showToast(data.message || data.error);
      fetchAll();
    } catch {
      showToast('Action failed');
    }
  };

  const columns = [
    { key: 'username', header: 'User', render: row => row.username },
    { key: 'fanPoints', header: 'Points', render: row => <span className="font-data">{row.fanPoints ?? 0}</span> },
    { key: 'premium', header: 'Premium', render: row => row.isPremium ? <Badge variant="upcoming">Pro</Badge> : '—' },
    { key: 'admin', header: 'Admin', render: row => row.isAdmin ? 'Yes' : '—' },
    {
      key: 'actions',
      header: '',
      render: row => (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => action(`/api/admin/user/${row.username}/toggle-premium`)}>
            Toggle Pro
          </Button>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout
      title="Admin"
      description="Platform overview and user management."
      action={
        <Button size="sm" onClick={() => action('/api/blog/generate')}>Refresh news</Button>
      }
    >
      {loading ? <Skeleton className="h-64" /> : (
        <>
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="Total users" value={stats?.totalUsers ?? '—'} />
            <StatTile label="Premium" value={stats?.premiumUsers ?? '—'} />
            <StatTile label="Predictions" value={stats?.totalPredictions ?? '—'} />
            <StatTile label="Articles" value={stats?.totalArticles ?? '—'} />
          </div>

          <Tabs defaultValue="users">
            <TabsList className="mb-4">
              <TabsTrigger value="users">Users</TabsTrigger>
            </TabsList>
            <TabsContent value="users">
              <div className="mb-4 flex gap-2">
                <Input placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} />
                <Button variant="secondary" onClick={fetchAll}>Search</Button>
              </div>
              <DataTable columns={columns} data={users.map(u => ({ ...u, id: u.username }))} emptyMessage="No users found." />
            </TabsContent>
          </Tabs>
        </>
      )}
      {toast && (
        <div className="fixed bottom-6 right-6 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-surface-0 shadow-lg">
          {toast}
        </div>
      )}
    </DashboardLayout>
  );
}
