import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { postRegisterParent } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { MaterialSymbol } from '../components/MaterialSymbol';

export function RegisterParentPage() {
  const navigate = useNavigate();
  const { isAuthenticated, setSessionFromLogin } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [studentCode, setStudentCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) navigate('/parent', { replace: true });
  }, [isAuthenticated, navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const code = studentCode.trim();
      const res = await postRegisterParent({
        email: email.trim(),
        password,
        fullName: fullName.trim(),
        studentIdToLink: null,
        studentRegistrationCodeToLink: code.length > 0 ? code : null,
      });
      setSessionFromLogin(res);
      navigate('/parent', { replace: true });
    } catch (err) {
      console.error('[QT Register]', err);
      setError(err instanceof Error ? err.message : 'Đăng ký thất bại.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#f1f5f9] p-md font-body-md text-on-background antialiased">
      {/* Gradient tĩnh thay blur-3xl để paint nhanh, không chờ GPU filter */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-br from-[#eef2ff] via-[#f1f5f9] to-[#f8fafc]"
        aria-hidden
      />
      <main className="relative z-10 w-full max-w-lg">
        <div className="overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm">
          <div className="flex flex-col items-center gap-sm border-b border-outline-variant/20 bg-white px-lg pb-md pt-lg text-center">
            <div className="mb-xs flex h-16 w-16 items-center justify-center rounded-xl bg-primary-container shadow-md">
              <MaterialSymbol name="school" className="text-4xl text-white" />
            </div>
            <h1 className="font-h1 text-primary-container">Quang Trung MN</h1>
            <p className="font-body-md text-outline">Đăng ký tài khoản phụ huynh</p>
          </div>
          <form className="space-y-md px-lg pb-lg pt-md" onSubmit={onSubmit}>
            {error ? (
              <div className="rounded-lg border border-error-container bg-error-container/30 px-3 py-2 text-sm text-error">
                {error}
              </div>
            ) : null}
            <div className="space-y-sm">
              <label className="block font-label-md text-on-surface-variant" htmlFor="reg-fullname">
                Họ và tên
              </label>
              <div className="relative">
                <MaterialSymbol
                  name="person"
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-outline"
                />
                <input
                  id="reg-fullname"
                  required
                  value={fullName}
                  onChange={(ev) => setFullName(ev.target.value)}
                  type="text"
                  placeholder="Nhập họ và tên đầy đủ"
                  className="w-full rounded-lg border border-outline-variant bg-white py-sm pl-10 pr-md transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-container"
                />
              </div>
            </div>
            <div className="space-y-sm">
              <label className="block font-label-md text-on-surface-variant" htmlFor="reg-email">
                Email
              </label>
              <div className="relative">
                <MaterialSymbol
                  name="mail"
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-outline"
                />
                <input
                  id="reg-email"
                  required
                  value={email}
                  onChange={(ev) => setEmail(ev.target.value)}
                  type="email"
                  autoComplete="email"
                  placeholder="example@email.com"
                  className="w-full rounded-lg border border-outline-variant bg-white py-sm pl-10 pr-md transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-container"
                />
              </div>
            </div>
            <div className="space-y-sm">
              <label className="block font-label-md text-on-surface-variant" htmlFor="reg-password">
                Mật khẩu
              </label>
              <div className="relative">
                <MaterialSymbol
                  name="lock"
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-outline"
                />
                <input
                  id="reg-password"
                  required
                  value={password}
                  onChange={(ev) => setPassword(ev.target.value)}
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-outline-variant bg-white py-sm pl-10 pr-md transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-container"
                />
              </div>
              <p className="text-label-sm text-on-surface-variant">
                Tối thiểu 6 ký tự, gồm chữ hoa, số và ký tự đặc biệt (theo cấu hình server).
              </p>
            </div>
            <div className="space-y-sm">
              <div className="flex items-center justify-between">
                <label className="block font-label-md text-on-surface-variant" htmlFor="reg-code">
                  Mã liên kết phụ huynh
                </label>
                <span className="text-label-sm font-normal italic text-outline">Tùy chọn</span>
              </div>
              <div className="relative">
                <MaterialSymbol
                  name="fingerprint"
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-outline"
                />
                <input
                  id="reg-code"
                  value={studentCode}
                  onChange={(ev) => setStudentCode(ev.target.value)}
                  type="text"
                  placeholder="VD: QT-2025-001 hoặc UUID đầy đủ / 8 ký tự đầu ID trên danh sách"
                  className="w-full rounded-lg border border-outline-variant bg-white py-sm pl-10 pr-md transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-container"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="mt-md w-full rounded-lg bg-primary-container py-sm font-h3 text-h3 text-white shadow-lg transition-all hover:bg-primary active:scale-[0.98] disabled:opacity-60"
            >
              {loading ? 'Đang xử lý…' : 'Đăng ký'}
            </button>
            <div className="pt-sm text-center">
              <p className="text-body-md text-on-surface-variant">
                Đã có tài khoản?{' '}
                <Link to="/login" className="ml-xs font-semibold text-secondary hover:underline">
                  Đăng nhập
                </Link>
              </p>
            </div>
          </form>
          <div className="flex justify-center gap-md border-t border-outline-variant/30 bg-surface-container-highest px-lg py-sm">
            <div className="flex items-center gap-1 text-label-sm text-outline">
              <MaterialSymbol name="verified_user" className="text-sm" />
              Hệ thống bảo mật
            </div>
            <div className="flex items-center gap-1 text-label-sm text-outline">
              <MaterialSymbol name="support_agent" className="text-sm" />
              Hỗ trợ 24/7
            </div>
          </div>
        </div>
        <footer className="mt-lg text-center">
          <p className="text-label-sm text-outline">
            © 2026 Quang Trung MN. Tất cả quyền được bảo lưu.
            <br />
            Hệ thống quản lý mầm non chuyên nghiệp.
          </p>
        </footer>
      </main>
    </div>
  );
}
