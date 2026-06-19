import { useState, useEffect, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '';

function authHeaders() {
  const token = localStorage.getItem('token');
  return { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) };
}

export default function AdminPanel() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [userMeta, setUserMeta] = useState({ total: 0, page: 1, pages: 1 });
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/stats`, { headers: authHeaders() });
      if (res.ok) setStats(await res.json());
    } catch { /* silent */ }
  }, []);

  const fetchUsers = useCallback(async (page = 1) => {
    try {
      const q = search ? `&search=${encodeURIComponent(search)}` : '';
      const res = await fetch(`${API_BASE}/api/admin/users?page=${page}&limit=20${q}`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
        setUserMeta({ total: data.total, page: data.page, pages: data.pages });
      }
    } catch { /* silent */ }
  }, [search]);

  useEffect(() => {
    Promise.all([fetchStats(), fetchUsers()]).finally(() => setLoading(false));
  }, [fetchStats, fetchUsers]);

  const handleAction = async (url, username) => {
    try {
      const res = await fetch(`${API_BASE}${url}`, { method: 'POST', headers: authHeaders() });
      const data = await res.json();
      showToast(data.message || data.error);
      fetchUsers(userMeta.page);
      fetchStats();
    } catch {
      showToast('Action failed');
    }
  };

  const handleGenerateBlog = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/blog/generate`, { method: 'POST', headers: authHeaders() });
      const data = await res.json();
      showToast(data.message || data.error);
    } catch {
      showToast('Failed to trigger blog generation');
    }
  };

  const S = {
    container: { padding: '24px', maxWidth: 900, margin: '0 auto', paddingTop: 'calc(var(--island-height, 60px) + 24px)' },
    h2: { color: 'var(--accent-cyber, #1ee6a7)', marginBottom: 8 },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 },
    card: { background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 16, textAlign: 'center' },
    cardVal: { fontSize: '1.6rem', fontWeight: 700, color: 'var(--accent-cyber, #1ee6a7)' },
    cardLabel: { color: '#aaa', fontSize: '0.8rem', marginTop: 4 },
    tab: (active) => ({ padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', background: active ? 'var(--accent-cyber, #1ee6a7)' : 'rgba(255,255,255,0.07)', color: active ? '#000' : '#aaa', marginRight: 8 }),
    row: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', marginBottom: 6, background: 'rgba(255,255,255,0.04)', borderRadius: 10, flexWrap: 'wrap' },
    smallBtn: (color = '#1ee6a7') => ({ padding: '4px 10px', borderRadius: 6, border: `1px solid ${color}33`, background: `${color}18`, color, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }),
    input: { padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: '#fff', flex: 1, minWidth: 200 },
    toast: { position: 'fixed', bottom: 24, right: 24, background: '#1ee6a7', color: '#000', padding: '10px 20px', borderRadius: 8, fontWeight: 600, zIndex: 9999 },
  };

  if (loading) return <div style={{ ...S.container, textAlign: 'center', color: '#aaa' }}>Loading admin data...</div>;

  return (
    <div style={S.container}>
      <h2 style={S.h2}>Admin Panel</h2>
      <p style={{ color: '#aaa', marginBottom: 20, fontSize: '0.9rem' }}>Live platform data. All actions server-enforced.</p>

      {stats && (
        <div style={S.grid}>
          {[
            { val: stats.totalUsers, label: 'Total Users' },
            { val: stats.premiumUsers, label: 'Premium' },
            { val: stats.activeToday, label: 'Active Today' },
            { val: stats.activeWeek, label: 'Active (7d)' },
            { val: stats.totalPredictions, label: 'Predictions' },
            { val: stats.totalFanPoints?.toLocaleString(), label: 'Total FanPoints' },
          ].map(s => (
            <div key={s.label} style={S.card}>
              <div style={S.cardVal}>{s.val}</div>
              <div style={S.cardLabel}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginBottom: 20, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button style={S.tab(activeTab === 'overview')} onClick={() => setActiveTab('overview')}>Overview</button>
        <button style={S.tab(activeTab === 'users')} onClick={() => setActiveTab('users')}>Users</button>
        <button style={S.tab(activeTab === 'actions')} onClick={() => setActiveTab('actions')}>Actions</button>
      </div>

      {activeTab === 'overview' && stats && (
        <div style={{ color: '#ccc', lineHeight: 1.8 }}>
          <p>Platform health at a glance. User engagement ratio: <strong style={{ color: '#1ee6a7' }}>{stats.totalUsers ? Math.round((stats.activeWeek / stats.totalUsers) * 100) : 0}%</strong> weekly active.</p>
          <p>Premium conversion: <strong style={{ color: '#f8c300' }}>{stats.totalUsers ? ((stats.premiumUsers / stats.totalUsers) * 100).toFixed(1) : 0}%</strong></p>
        </div>
      )}

      {activeTab === 'users' && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <input
              type="text" placeholder="Search username..."
              value={search} onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchUsers(1)}
              style={S.input}
            />
            <button onClick={() => fetchUsers(1)} style={S.smallBtn()}>Search</button>
          </div>
          <p style={{ color: '#888', fontSize: '0.8rem', marginBottom: 8 }}>{userMeta.total} users (page {userMeta.page}/{userMeta.pages})</p>

          {users.map(u => (
            <div key={u.username} style={S.row}>
              <span style={{ fontSize: '1.3rem' }}>{u.avatar || '🦁'}</span>
              <span style={{ fontWeight: 600, flex: 1 }}>
                {u.username}
                {u.isAdmin && <span style={{ marginLeft: 6, fontSize: '0.7rem', background: '#ff606033', color: '#ff6060', padding: '2px 6px', borderRadius: 4 }}>ADMIN</span>}
                {u.isPremium && <span style={{ marginLeft: 6, fontSize: '0.7rem', background: '#f8c30033', color: '#f8c300', padding: '2px 6px', borderRadius: 4 }}>PRO</span>}
              </span>
              <span style={{ color: '#f8c300', fontWeight: 700, fontSize: '0.85rem' }}>🪙 {u.fanPoints.toLocaleString()}</span>
              <span style={{ color: '#aaa', fontSize: '0.8rem' }}>🔥{u.streak}d</span>
              <span style={{ color: '#aaa', fontSize: '0.8rem' }}>🔮{u.predictions}</span>
              <button onClick={() => handleAction(`/api/admin/user/${u.username}/toggle-premium`, u.username)} style={S.smallBtn('#f8c300')}>
                {u.isPremium ? 'Revoke Pro' : 'Grant Pro'}
              </button>
              <button onClick={() => handleAction(`/api/admin/user/${u.username}/toggle-admin`, u.username)} style={S.smallBtn('#ff6060')}>
                {u.isAdmin ? 'Revoke Admin' : 'Grant Admin'}
              </button>
            </div>
          ))}

          {userMeta.pages > 1 && (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
              <button disabled={userMeta.page <= 1} onClick={() => fetchUsers(userMeta.page - 1)} style={S.smallBtn()}>← Prev</button>
              <button disabled={userMeta.page >= userMeta.pages} onClick={() => fetchUsers(userMeta.page + 1)} style={S.smallBtn()}>Next →</button>
            </div>
          )}
        </>
      )}

      {activeTab === 'actions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button onClick={handleGenerateBlog} style={{ ...S.smallBtn(), padding: '12px 20px', fontSize: '0.9rem' }}>
            Generate Daily Blog Articles
          </button>
          <p style={{ color: '#888', fontSize: '0.8rem' }}>Triggers AI article generation for trending sports topics.</p>
        </div>
      )}

      {toast && <div style={S.toast}>{toast}</div>}
    </div>
  );
}
