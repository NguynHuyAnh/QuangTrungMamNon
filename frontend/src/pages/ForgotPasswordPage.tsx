import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { postForgotPassword } from '../api/client';
import { MaterialSymbol } from '../components/MaterialSymbol';

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const r = await postForgotPassword({ email: email.trim() });
      if (r.resetToken) {
        navigate('/reset-password', {
          replace: true,
          state: { email: email.trim(), token: r.resetToken },
        });
        return;
      }
      setInfo(r.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không gửi được yêu cầu.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#f1f5f9] p-md font-body-md text-on-background">
      <main className="w-full max-w-[440px] overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm">
        <div className="flex flex-col items-center gap-sm px-xl pb-md pt-xl text-center">
          <div className="mb-sm flex h-16 w-16 items-center justify-center rounded-xl bg-primary-container shadow-md">
            <MaterialSymbol name="lock_reset" className="text-4xl text-white" />
          </div>
          <h1 className="font-h1 text-primary-container">Quên mật khẩu</h1>
          <p className="font-body-md text-outline">Nhập email đăng nhập để nhận hướng dẫn đặt lại mật khẩu</p>
        </div>
        <div className="px-xl pb-xl pt-sm">
          <form className="flex flex-col gap-lg" onSubmit={onSubmit}>
            {error ? (
              <div className="rounded-lg border border-error-container bg-error-container/30 px-3 py-2 text-sm text-error">
                {error}
              </div>
            ) : null}
            {info ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-on-surface">
                {info}
              </div>
            ) : null}
            <div className="flex flex-col gap-xs">
              <label className="font-label-md text-on-surface" htmlFor="forgot-email">
                Email đăng nhập
              </label>
              <div className="relative flex items-center">
                <MaterialSymbol
                  name="mail"
                  className="pointer-events-none absolute left-3 text-[20px] text-outline"
                />
                <input
                  id="forgot-email"
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
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-container py-3.5 font-label-md text-white shadow-md transition-all hover:bg-tertiary-container active:scale-[0.98] disabled:opacity-60"
            >
              {loading ? 'Đang gửi…' : 'Gửi yêu cầu'}
            </button>
          </form>
          <div className="mt-lg text-center">
            <Link to="/login" className="font-label-md text-primary-container hover:underline">
              ← Quay lại đăng nhập
            </Link>
          </div>
        </div>
        <div className="flex items-center justify-center bg-surface-container-low/50 px-xl py-sm">
          <span className="text-[10px] font-bold uppercase tracking-widest text-outline">
            Secure Education Portal
          </span>
        </div>
      </main>
    </div>
  );
}
