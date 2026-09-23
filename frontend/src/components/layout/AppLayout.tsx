import { Suspense } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Spinner } from '../ui/Feedback';
import { Icon, type IconName } from '../ui/Icon';

const NAV: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'Dashboard', icon: 'dashboard' },
  { to: '/expenses', label: 'Expenses', icon: 'expenses' },
  { to: '/budgets', label: 'Budgets', icon: 'budgets' },
  { to: '/reports', label: 'Reports', icon: 'reports' },
  { to: '/categories', label: 'Categories', icon: 'categories' },
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const initials = user?.name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="app-shell">
      {/* Sidebar on desktop, top bar + bottom tab bar on mobile */}
      <aside className="sidebar">
        <div className="brand">
          <span className="brand__logo">
            <Icon name="wallet" size={18} />
          </span>
          <span className="brand__name">Spendwise</span>
        </div>
        <nav className="nav" aria-label="Main">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} className="nav__link">
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar__user">
          <span className="avatar" aria-hidden="true">
            {initials}
          </span>
          <div className="sidebar__user-text">
            <strong>{user?.name}</strong>
            <span>{user?.email}</span>
          </div>
          <button type="button" className="icon-button" onClick={() => void logout()} aria-label="Sign out" title="Sign out">
            <Icon name="logout" />
          </button>
        </div>
      </aside>
      <header className="topbar">
        <div className="brand">
          <span className="brand__logo">
            <Icon name="wallet" size={18} />
          </span>
          <span className="brand__name">Spendwise</span>
        </div>
        <button type="button" className="icon-button" onClick={() => void logout()} aria-label="Sign out">
          <Icon name="logout" />
        </button>
      </header>
      <main className="main">
        <Suspense fallback={<Spinner />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
