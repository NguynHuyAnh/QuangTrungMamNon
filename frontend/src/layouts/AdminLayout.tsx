import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import {
  canAccessUserDirectory,
  canStaffAccessAttendanceNav,
  canStaffAccessCatalogNav,
  canStaffAccessDishesNav,
  canStaffAccessMenuNav,
  canStaffAccessStudentsNav,
} from '../auth/staffNavAccess';
import { MaterialSymbol } from '../components/MaterialSymbol';

type NavItem = {
  to: string;
  label: string;
  icon: string;
  feesModule?: boolean;
  userAdmin?: boolean;
  /** Khớp policy API — ẩn menu nếu role không có quyền (vd: KeToan không có ClassesRead). */
  visibleIf?: (roles: string[]) => boolean;
};

const navItems: NavItem[] = [
  { to: '/app/dashboard', label: 'Tổng quan', icon: 'dashboard' },
  { to: '/app/catalog', label: 'Năm học & lớp', icon: 'school', visibleIf: canStaffAccessCatalogNav },
  { to: '/app/users', label: 'Người dùng', icon: 'manage_accounts', userAdmin: true },
  { to: '/app/students', label: 'Học sinh', icon: 'person_search', visibleIf: canStaffAccessStudentsNav },
  { to: '/app/attendance', label: 'Điểm danh', icon: 'fact_check', visibleIf: canStaffAccessAttendanceNav },
  { to: '/app/announcements', label: 'Thông báo', icon: 'campaign' },
  { to: '/app/dishes', label: 'Loại thức ăn', icon: 'restaurant', visibleIf: canStaffAccessDishesNav },
  { to: '/app/menu', label: 'Thực đơn', icon: 'restaurant_menu', visibleIf: canStaffAccessMenuNav },
  { to: '/app/fee-structures', label: 'Biểu phí', icon: 'request_quote', feesModule: true },
  { to: '/app/fee-assignments', label: 'Gán phí', icon: 'assignment', feesModule: true },
  { to: '/app/payments', label: 'Thanh toán', icon: 'payments', feesModule: true },
  { to: '/app/invoices', label: 'Hóa đơn', icon: 'receipt_long', feesModule: true },
];

function canAccessFeesNav(roles: string[]) {
  return roles.some((r) => r === 'KeToan' || r === 'BanGiamHieu' || r === 'SuperAdmin');
}

function canManageUsersNav(roles: string[]) {
  return canAccessUserDirectory(roles);
}

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { email, logout, roles } = useAuth();
  const visibleNav = navItems.filter(
    (item) =>
      (!item.feesModule || canAccessFeesNav(roles)) &&
      (!item.userAdmin || canManageUsersNav(roles)) &&
      (!item.visibleIf || item.visibleIf(roles)),
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!sidebarOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [sidebarOpen]);

  const initials =
    email
      ?.split('@')[0]
      ?.split(/[.\s_]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]!.toUpperCase())
      .join('') || 'QT';

  return (
    <div className="min-h-screen bg-[#f9f9ff]">
      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Đóng menu"
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-[1px] lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <aside
        className={[
          'fixed left-0 top-0 z-50 flex h-full w-[260px] flex-col border-r border-blue-800 bg-[#0B3D91] py-4 shadow-xl transition-transform duration-200 ease-out lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        ].join(' ')}
      >
        <div className="mb-4 flex items-center justify-between gap-2 px-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white shadow-md">
              <MaterialSymbol name="school" className="text-2xl text-primary-container" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold leading-tight tracking-tight text-white">Quang Trung MN</h1>
              <p className="truncate text-[10px] font-semibold uppercase tracking-widest text-blue-200">
                Hệ thống quản lý mầm non
              </p>
            </div>
          </div>
          <button
            type="button"
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-white hover:bg-white/10 lg:hidden"
            aria-label="Đóng"
            onClick={() => setSidebarOpen(false)}
          >
            <MaterialSymbol name="close" className="text-[24px]" />
          </button>
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 pb-4">
          {visibleNav.map((item, index) => {
            const prev = index > 0 ? visibleNav[index - 1] : null;
            const showFinanceLabel = item.feesModule && (!prev || !prev.feesModule);
            return (
              <div key={item.to}>
                {showFinanceLabel ? (
                  <p className="mb-1 mt-2 px-4 text-[10px] font-black uppercase tracking-widest text-blue-200/80">
                    Kế toán &amp; thu
                  </p>
                ) : null}
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    [
                      'flex items-center gap-3 rounded-lg px-4 py-3 font-medium transition-all duration-200',
                      isActive
                        ? 'bg-blue-800/50 text-white'
                        : 'text-blue-100/70 hover:bg-blue-800/30 hover:text-white',
                    ].join(' ')
                  }
                >
                  <MaterialSymbol name={item.icon} />
                  <span className="text-sm">{item.label}</span>
                </NavLink>
              </div>
            );
          })}
        </nav>
      </aside>

      <header className="fixed left-0 right-0 top-0 z-30 flex h-14 items-center border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur-md sm:h-16 lg:left-[260px]">
        <div className="flex w-full min-w-0 items-center justify-between gap-2 px-3 sm:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <button
              type="button"
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 lg:hidden"
              aria-label="Mở menu"
              onClick={() => setSidebarOpen(true)}
            >
              <MaterialSymbol name="menu" className="text-[24px]" />
            </button>
            <div className="relative hidden min-w-0 flex-1 sm:block md:max-w-md lg:max-w-lg xl:max-w-xl">
              <MaterialSymbol
                name="search"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="search"
                placeholder="Tìm kiếm học sinh, lớp học..."
                className="w-full rounded-full border-none bg-slate-100 py-2 pl-10 pr-4 text-sm transition-all focus:ring-2 focus:ring-primary-container"
              />
            </div>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2 sm:gap-4 md:gap-6">
            <nav className="mr-2 hidden items-center gap-6 lg:flex xl:gap-8">
              <span className="flex h-14 items-center border-b-2 border-primary-container text-sm font-medium text-primary-container xl:h-16">
                Trang chủ
              </span>
            </nav>
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="flex items-center gap-2 pl-0 sm:gap-3 sm:pl-2">
                <div className="hidden text-right sm:block">
                  <p className="max-w-[100px] truncate text-xs font-bold text-on-surface sm:max-w-[140px] md:max-w-[180px] md:text-sm">
                    {email ?? '—'}
                  </p>
                  <p className="hidden text-xs text-slate-500 md:block">Đã đăng nhập</p>
                </div>
                <div
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border-2 border-slate-100 bg-primary-container text-xs font-bold text-white sm:h-10 sm:w-10 sm:text-sm"
                  title={email ?? undefined}
                >
                  {initials}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    navigate('/login', { replace: true });
                  }}
                  className="rounded-lg border border-slate-200 px-2 py-1.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-50 sm:px-3 sm:text-xs"
                >
                  <span className="sm:hidden">Ra</span>
                  <span className="hidden sm:inline">Đăng xuất</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="min-h-screen min-w-0 pt-14 sm:pt-16 lg:ml-[260px]">
        <div className="mx-auto max-w-[1440px] p-3 sm:p-md lg:p-lg">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
