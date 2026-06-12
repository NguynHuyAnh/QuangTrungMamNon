import { FormEvent, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { postResetPassword } from '../api/client';
import { MaterialSymbol } from '../components/MaterialSymbol';

type LocationState = { email?: string; token?: string } | null;

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const s = location.state as LocationState;
    if (s?.email) setEmail(s.email);
    if (s?.token) setToken(s.token);
  }, [location.state]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== password2) {
      setError('Mật khẩu nhập lại không khớp.');
      return;
    }
    if (!token.trim()) {
      setError('Cần mã xác nhận (từ email hoặc từ bước quên mật khẩu).');
      return;
    }
    setLoading(true);
    try {
      await postResetPassword({
        email: email.trim(),
        token: token.trim(),
        newPassword: password,
      });
      setSuccess(true);
      window.setTimeout(() => navigate('/login', { replace: true }), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đặt lại mật khẩu thất bại.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-[#f1f5f9] p-md font-body-md">
        <main className="w-full max-w-[440px] rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-xl text-center shadow-sm">
          <MaterialSymbol name="check_circle" className="mx-auto mb-md text-5xl text-green-600" />
          <p className="font-h3 text-primary">Đã đặt lại mật khẩu</p>
          <p className="mt-sm text-on-surface-variant">Đang chuyển đến trang đăng nhập…</p>
          <Link to="/login" className="mt-md inline-block font-semibold text-primary-container hover:underline">
            Đăng nhập ngay
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#f1f5f9] p-md font-body-md text-on-background">
      <main className="w-full max-w-[440px] overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm">
        <div className="flex flex-col items-center gap-sm px-xl pb-md pt-xl text-center">
          <div className="mb-sm flex h-16 w-16 items-center justify-center rounded-xl bg-primary-container shadow-md">
            <MaterialSymbol name="vpn_key" className="text-4xl text-white" />
          </div>
          <h1 className="font-h1 text-primary-container">Đặt lại mật khẩu</h1>
          <p className="font-body-md text-outline">Nhập mã xác nhận và mật khẩu mới</p>
        </div>
        <div className="px-xl pb-xl pt-sm">
          <form className="flex flex-col gap-lg" onSubmit={onSubmit}>
            {error ? (
              <div className="rounded-lg border border-error-container bg-error-container/30 px-3 py-2 text-sm text-error">
                {error}
              </div>
            ) : null}
            <div className="flex flex-col gap-xs">
              <label className="font-label-md text-on-surface" htmlFor="reset-email">
                Email đăng nhập
              </label>
              <input
                id="reset-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
                className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-3 font-body-md outline-none focus:ring-2 focus:ring-primary-container"
              />
            </div>
            <div className="flex flex-col gap-xs">
              <label className="font-label-md text-on-surface" htmlFor="reset-token">
                Mã xác nhận
              </label>
              <textarea
                id="reset-token"
                required
                rows={3}
                value={token}
                onChange={(ev) => setToken(ev.target.value)}
                placeholder="Dán mã từ email (hoặc giữ nguyên nếu hệ thống đã điền)"
                className="w-full resize-y rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 font-mono text-xs outline-none focus:ring-2 focus:ring-primary-container"
              />
              <p className="text-label-sm text-on-surface-variant">
                Khi chạy local (Development), có thể được điền tự động sau bước &quot;Quên mật khẩu&quot;.
              </p>
            </div>
            <div className="flex flex-col gap-xs">
              <label className="font-label-md text-on-surface" htmlFor="reset-pw">
                Mật khẩu mới
              </label>
              <div className="relative flex items-center">
                <MaterialSymbol
                  name="lock"
                  className="pointer-events-none absolute left-3 text-[20px] text-outline"
                />
                <input
                  id="reset-pw"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(ev) => setPassword(ev.target.value)}
                  className="w-full rounded-lg border border-outline-variant bg-surface-container-low py-3 pl-10 pr-10 font-body-md outline-none focus:ring-2 focus:ring-primary-container"
                />
                <button
                  type="button"
                  className="absolute right-3 text-outline hover:text-on-surface"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  <MaterialSymbol name={showPassword ? 'visibility_off' : 'visibility'} className="text-[20px]" />
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-xs">
              <label className="font-label-md text-on-surface" htmlFor="reset-pw2">
                Nhập lại mật khẩu mới
              </label>
              <input
                id="reset-pw2"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                value={password2}
                onChange={(ev) => setPassword2(ev.target.value)}
                className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-3 font-body-md outline-none focus:ring-2 focus:ring-primary-container"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-container py-3.5 font-label-md text-white shadow-md transition-all hover:bg-tertiary-container active:scale-[0.98] disabled:opacity-60"
            >
              {loading ? 'Đang lưu…' : 'Đặt lại mật khẩu'}
            </button>
          </form>
          <div className="mt-lg flex flex-col gap-sm text-center">
            <Link to="/forgot-password" className="font-label-md text-on-surface-variant hover:text-primary-container">
              Gửi lại yêu cầu quên mật khẩu
            </Link>
            <Link to="/login" className="font-label-md text-primary-container hover:underline">
              ← Đăng nhập
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
