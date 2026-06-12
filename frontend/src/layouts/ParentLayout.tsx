import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { MaterialSymbol } from '../components/MaterialSymbol';

const items = [
  { to: '/parent', label: 'Trang chủ', icon: 'home', end: true },
  { to: '/parent/attendance', label: 'Điểm danh', icon: 'calendar_today' },
  { to: '/parent/announcements', label: 'Thông báo', icon: 'campaign' },
  { to: '/parent/payments', label: 'Học phí', icon: 'account_balance_wallet' },
];

export function ParentLayout() {
  const navigate = useNavigate();
  const { email, logout } = useAuth();
  return (
    <div className="min-h-screen bg-background font-body-md text-on-surface">
      <header className="fixed top-0 z-50 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm">
        <span className="max-w-[50%] truncate text-xl font-bold text-primary">Quang Trung MN — Phụ huynh</span>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-container text-xs font-bold text-white">
              PH
            </div>
            <span className="hidden max-w-[140px] truncate text-label-md font-medium md:block">{email ?? 'Phụ huynh'}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              logout();
              navigate('/login', { replace: true });
            }}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Đăng xuất
          </button>
        </div>
      </header>

      <aside className="fixed left-0 top-0 z-40 hidden h-full w-64 flex-col border-r border-slate-200 bg-white pb-6 pt-20 lg:flex">
        <div className="mb-8 px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-container">
              <MaterialSymbol name="school" className="text-white" />
            </div>
            <div>
              <div className="text-lg font-black uppercase tracking-tighter text-blue-900">Cổng PH</div>
              <div className="text-xs text-slate-500">Theo dõi con</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-4">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 rounded-xl px-4 py-3 transition-all',
                  isActive
                    ? 'border-r-4 border-blue-900 bg-blue-50 text-blue-900'
                    : 'text-slate-600 hover:bg-slate-100',
                ].join(' ')
              }
            >
              <MaterialSymbol name={item.icon} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="mx-auto max-w-container-max pb-24 pt-16 lg:pl-64 lg:pb-8">
        <div className="space-y-xl p-gutter lg:p-xl">
          <Outlet />
        </div>
      </main>

      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-slate-200 bg-white/95 px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-4px_20px_rgba(15,23,42,0.08)] backdrop-blur-sm lg:hidden"
        aria-label="Điều hướng phụ huynh"
      >
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              [
                'flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg py-2 text-[10px] font-semibold transition-colors',
                isActive ? 'text-primary' : 'text-slate-500',
              ].join(' ')
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={[
                    'flex h-9 w-9 items-center justify-center rounded-xl transition-colors',
                    isActive ? 'bg-blue-50 text-blue-900' : 'text-slate-500',
                  ].join(' ')}
                >
                  <MaterialSymbol name={item.icon} className="text-[22px]" />
                </span>
                <span className="truncate px-0.5">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
