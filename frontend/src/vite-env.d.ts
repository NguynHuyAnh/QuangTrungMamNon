/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_DEBUG_API?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  /** Dev: `await window.__QT_RUN_AUTH_API_TESTS__()` — self-test auth API qua proxy hiện tại */
  __QT_RUN_AUTH_API_TESTS__?: () => Promise<void>;
}