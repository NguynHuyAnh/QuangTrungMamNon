/**
 * Gọi từ console (chỉ dev): await window.__QT_RUN_AUTH_API_TESTS__()
 * Kiểm tra nhanh login/register qua cùng URL mà FE đang dùng (proxy hoặc VITE_API_BASE_URL).
 */
const base = () => (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';

type Case = { name: string; run: () => Promise<{ ok: boolean; detail: string }> };

export async function runAuthApiSelfTests(): Promise<void> {
  const results: { name: string; ok: boolean; detail: string }[] = [];

  const cases: Case[] = [
    {
      name: 'POST login superadmin',
      run: async () => {
        const r = await fetch(`${base()}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'superadmin@demo.local', password: 'Demo@123' }),
        });
        const t = await r.text();
        return { ok: r.ok, detail: `${r.status} ${t.slice(0, 500)}` };
      },
    },
    {
      name: 'POST login giaovien',
      run: async () => {
        const r = await fetch(`${base()}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'giaovien@demo.local', password: 'Demo@123' }),
        });
        const t = await r.text();
        return { ok: r.ok, detail: `${r.status} len=${t.length}` };
      },
    },
    {
      name: 'POST login phuhuynh',
      run: async () => {
        const r = await fetch(`${base()}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'phuhuynh@demo.local', password: 'Demo@123' }),
        });
        const t = await r.text();
        return { ok: r.ok, detail: `${r.status} len=${t.length}` };
      },
    },
    {
      name: 'POST login wrong password → 401',
      run: async () => {
        const r = await fetch(`${base()}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'superadmin@demo.local', password: 'Wrong!' }),
        });
        return { ok: r.status === 401, detail: `status=${r.status}` };
      },
    },
    {
      name: 'POST register-parent new email',
      run: async () => {
        const email = `browser_test_${Date.now()}@test.local`;
        const r = await fetch(`${base()}/api/auth/register-parent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password: 'Demo@123',
            fullName: 'Browser test PH',
            studentIdToLink: null,
          }),
        });
        const t = await r.text();
        return { ok: r.ok, detail: `${r.status} ${t.slice(0, 300)}` };
      },
    },
    {
      name: 'POST register-parent duplicate → 409',
      run: async () => {
        const r = await fetch(`${base()}/api/auth/register-parent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'superadmin@demo.local',
            password: 'Demo@123',
            fullName: 'X',
            studentIdToLink: null,
          }),
        });
        return { ok: r.status === 409, detail: `status=${r.status}` };
      },
    },
  ];

  console.group('[QT] Auth API self-tests');
  console.info('[QT] API base:', base() || '(rỗng = relative /api qua Vite proxy)');
  for (const c of cases) {
    try {
      const out = await c.run();
      results.push({ name: c.name, ...out });
      if (out.ok) console.log('PASS', c.name, out.detail);
      else console.error('FAIL', c.name, out.detail);
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      results.push({ name: c.name, ok: false, detail });
      console.error('FAIL', c.name, detail);
    }
  }
  const pass = results.filter((x) => x.ok).length;
  console.info(`[QT] Kết quả: ${pass}/${results.length} pass`);
  console.table(results);
  console.groupEnd();
}
