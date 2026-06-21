import { useState, useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Radio,
  Trophy,
  BarChart3,
  Users,
  Clock,
  Globe2,
  BookOpen,
  LineChart,
  Shield,
  User,
  Search,
  LogOut,
  Menu,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/ui/button';
import { CommandSearch } from '@/ui/command-search';
import { AuthModal } from '@/ui/auth-modal';
import MomentEngine from '@/components/MomentEngine.jsx';
import { hashToPath, pageIdToPath } from '@/utils/routes';

const NAV_ITEMS = [
  { to: '/', label: 'Live', icon: Radio, end: true },
  { to: '/arena', label: 'Arena', icon: Trophy },
  { to: '/standings', label: 'Standings', icon: BarChart3 },
  { to: '/leaderboard', label: 'Rankings', icon: Users },
  { to: '/timemachine', label: 'History', icon: Clock },
  { to: '/crowdpulse', label: 'Pulse', icon: Globe2 },
  { to: '/blog', label: 'Stories', icon: BookOpen },
  { to: '/analytics', label: 'Analytics', icon: LineChart },
];

const MOBILE_NAV = [
  { to: '/', label: 'Live', icon: Radio, end: true },
  { to: '/arena', label: 'Arena', icon: Trophy },
  { to: '/crowdpulse', label: 'Pulse', icon: Globe2 },
  { to: '/profile', label: 'Account', icon: User },
];

function SideNavLink({ to, label, icon: Icon, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'group flex flex-col items-center gap-1 rounded-lg px-2 py-2.5 text-[10px] font-medium uppercase tracking-wide transition-colors',
          isActive ? 'bg-accent/15 text-accent' : 'text-muted hover:bg-surface-2 hover:text-foreground'
        )
      }
      title={label}
    >
      <Icon className="h-5 w-5 shrink-0" strokeWidth={1.75} />
      <span className="hidden xl:block">{label}</span>
    </NavLink>
  );
}

function TopBar({ onSearch, onLogin, user, onLogout }) {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-border bg-surface-0/95 px-4 backdrop-blur-md lg:px-6">
      <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold tracking-tight text-foreground">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
          <Zap className="h-4 w-4" fill="currentColor" />
        </span>
        <span className="hidden sm:inline">Esportsduniya</span>
      </Link>

      <div className="hidden flex-1 items-center lg:flex">
        <button
          type="button"
          onClick={onSearch}
          className="flex h-9 w-full max-w-md items-center gap-2 rounded-lg border border-border bg-surface-1 px-3 text-sm text-muted transition-colors hover:border-border hover:bg-surface-2"
        >
          <Search className="h-4 w-4" />
          Search...
          <kbd className="ml-auto rounded border border-border bg-surface-2 px-1.5 py-0.5 text-[10px]">⌘K</kbd>
        </button>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onSearch} aria-label="Search">
          <Search className="h-4 w-4" />
        </Button>
        {user?.isAdmin && (
          <Button variant="ghost" size="sm" asChild>
            <Link to="/admin"><Shield className="mr-1 h-4 w-4" />Admin</Link>
          </Button>
        )}
        {user?.username ? (
          <>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/profile">
                <span className="mr-1.5">{user.avatar || '👤'}</span>
                {user.username}
              </Link>
            </Button>
            <Button variant="ghost" size="icon" onClick={onLogout} aria-label="Log out">
              <LogOut className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <Button size="sm" onClick={onLogin}>Sign in</Button>
        )}
      </div>
    </header>
  );
}

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    window.esportsNavigate = (pageId) => navigate(pageIdToPath(pageId));
    window.esportsNavigatePath = (path) => navigate(path);
    window.mountLoginScreen = () => setAuthOpen(true);
  }, [navigate]);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || hash.length <= 1) return;
    const path = hashToPath(hash);
    window.history.replaceState(null, '', path);
    if (path !== location.pathname) {
      navigate(path, { replace: true });
    }
  }, [navigate, location.pathname]);

  useEffect(() => {
    const onLoginOpen = () => setAuthOpen(true);
    document.addEventListener('esd:open-login', onLoginOpen);
    return () => document.removeEventListener('esd:open-login', onLoginOpen);
  }, []);

  const openLogin = () => setAuthOpen(true);

  return (
    <div className="flex min-h-screen bg-surface-0">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[72px] flex-col border-r border-border bg-surface-1 pt-14 xl:w-36 lg:flex">
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
          {NAV_ITEMS.map(item => (
            <SideNavLink key={item.to} {...item} />
          ))}
        </nav>
        <div className="border-t border-border p-2">
          <SideNavLink to="/profile" label="Account" icon={User} />
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col lg:pl-[72px] xl:pl-36">
        <TopBar
          onSearch={() => setSearchOpen(true)}
          onLogin={openLogin}
          user={user}
          onLogout={logout}
        />

        <main className="flex-1 px-4 py-6 pb-24 lg:px-8 lg:pb-8">
          <Outlet context={{ openLogin }} />
        </main>

        <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-border bg-surface-1/95 backdrop-blur-md lg:hidden">
          {MOBILE_NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium',
                  isActive ? 'text-accent' : 'text-muted'
                )
              }
            >
              <Icon className="h-5 w-5" strokeWidth={1.75} />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>

      <CommandSearch open={searchOpen} onOpenChange={setSearchOpen} />
      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
      <MomentEngine />
    </div>
  );
}
