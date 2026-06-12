import { FormEvent, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { postLogin } from '../api/client';
import { isStaffRole, useAuth } from '../auth/AuthContext';
import { MaterialSymbol } from '../components/MaterialSymbol';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const { isAuthenticated, roles, setSessionFromLogin } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (from && from.startsWith('/app') && isStaffRole(roles)) {
      navigate(from, { replace: true });
      return;
    }
    navigate(isStaffRole(roles) ? '/app/dashboard' : '/parent', { replace: true });
  }, [isAuthenticated, roles, from, navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await postLogin({ email: email.trim(), password });
      setSessionFromLogin(res);
      if (!remember) {
        // vẫn lưu localStorage để đơn giản; có thể đổi sang sessionStorage sau
      }
      navigate(isStaffRole(res.roles) ? '/app/dashboard' : '/parent', { replace: true });
    } catch (err) {
      console.error('[QT Login]', err);
      setError(err instanceof Error ? err.message : 'Đăng nhập thất bại.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#f1f5f9] p-md font-body-md text-on-background">
      <main className="w-full max-w-[440px] overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm">
        <div className="flex flex-col items-center gap-sm px-xl pb-md pt-xl text-center">
          <div className="mb-sm flex h-16 w-16 items-center justify-center rounded-xl bg-primary-container shadow-md">
            <MaterialSymbol name="school" className="text-4xl text-white" />
          </div>
          <h1 className="font-h1 text-primary-container">Quang Trung MN</h1>
          <p className="font-body-md text-outline">Hệ thống quản lý mầm non chuyên nghiệp</p>
        </div>
        <div className="px-xl pb-xl pt-sm">
          <form className="flex flex-col gap-lg" onSubmit={onSubmit}>
            {error ? (
              <div className="rounded-lg border border-error-container bg-error-container/30 px-3 py-2 text-sm text-error">
                {error}
              </div>
            ) : null}
            <div className="flex flex-col gap-xs">
              <label className="font-label-md text-on-surface" htmlFor="email">
                Email đăng nhập
              </label>
              <div className="relative flex items-center">
                <MaterialSymbol
                  name="mail"
                  className="pointer-events-none absolute left-3 text-[20px] text-outline"
                />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(ev) => setEmail(ev.target.value)}
                  placeholder="name@school.edu.vn"
                  className="w-full rounded-lg border border-outline-variant bg-surface-container-low py-3 pl-10 pr-4 font-body-md outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-primary-container"
                />
              </div>
            </div>
            <div className="flex flex-col gap-xs">
              <div className="flex items-center justify-between">
                <label className="font-label-md text-on-surface" htmlFor="password">
                  Mật khẩu
                </label>
                <Link
                  to="/forgot-password"
                  className="text-label-sm text-primary-container hover:underline"
                >
                  Quên mật khẩu?
                </Link>
              </div>
              <div className="relative flex items-center">
                <MaterialSymbol
                  name="lock"
                  className="pointer-events-none absolute left-3 text-[20px] text-outline"
                />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(ev) => setPassword(ev.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-outline-variant bg-surface-container-low py-3 pl-10 pr-10 font-body-md outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-primary-container"
                />
                <button
                  type="button"
                  className="absolute right-3 text-outline transition-colors hover:text-on-surface"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  <MaterialSymbol name={showPassword ? 'visibility_off' : 'visibility'} className="text-[20px]" />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-sm">
              <input
                id="remember"
                type="checkbox"
                checked={remember}
                onChange={(ev) => setRemember(ev.target.checked)}
                className="h-5 w-5 rounded border-outline-variant text-primary-container focus:ring-primary-container"
              />
              <label htmlFor="remember" className="cursor-pointer select-none font-body-md text-on-surface-variant">
                Ghi nhớ đăng nhập
              </label>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-container py-3.5 font-label-md text-white shadow-md transition-all hover:bg-tertiary-container active:scale-[0.98] disabled:opacity-60"
            >
              <span>{loading ? 'Đang xử lý…' : 'Đăng nhập'}</span>
              {!loading ? <MaterialSymbol name="login" className="text-[18px]" /> : null}
            </button>
          </form>
          <div className="mt-xl border-t border-outline-variant/30 pt-lg text-center">
            <p className="mb-sm font-body-md text-on-surface-variant">Bạn chưa có tài khoản?</p>
            <Link
              to="/register-parent"
              className="inline-flex items-center gap-xs rounded-full border border-secondary-container/20 bg-secondary-container/5 px-4 py-2 font-label-md text-secondary-container transition-colors hover:text-secondary"
            >
              <MaterialSymbol name="person_add" className="text-[18px]" />
              Đăng ký tài khoản phụ huynh
            </Link>
          </div>
        </div>
        <div className="flex items-center justify-center bg-surface-container-low/50 px-xl py-sm">
          <span className="text-[10px] font-bold uppercase tracking-widest text-outline">
            Secure Education Portal
          </span>
        </div>
      </main>
      <div className="pointer-events-none fixed inset-0 -z-10 opacity-40">
        <div className="absolute left-[5%] top-[10%] h-64 w-64 rounded-full bg-primary-container/5 blur-3xl" />
        <div className="absolute bottom-[10%] right-[5%] h-80 w-80 rounded-full bg-secondary-container/5 blur-3xl" />
      </div>
    </div>
  );
}
