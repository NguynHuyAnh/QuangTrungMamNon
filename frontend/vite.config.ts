import type { ServerResponse } from 'http';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/** Trùng cổng mặc định trong `launchSettings.json` (profile http). */
const defaultApiTarget = 'http://localhost:5022';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET ?? defaultApiTarget,
        changeOrigin: true,
        configure(proxy) {
          proxy.on('error', (err, _req, res) => {
            const r = res as ServerResponse | undefined;
            if (r && !r.headersSent) {
              const ne = err as NodeJS.ErrnoException & Error;
              const reason =
                ne?.code && ne?.message
                  ? `${ne.code} (${ne.message})`
                  : ne?.message || String(err ?? 'unknown');
              r.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
              r.end(
                JSON.stringify({
                  title: 'Không kết nối được API',
                  detail: `Backend chưa chạy hoặc không lắng nghe ${defaultApiTarget}. Trong thư mục frontend chạy: npm run dev:all (API + web), hoặc terminal riêng: dotnet run --project backend/QuangTrung.Api --launch-profile http. Chi tiết: ${reason}`,
                }),
              );
            }
          });
        },
      },
    },
  },
});
