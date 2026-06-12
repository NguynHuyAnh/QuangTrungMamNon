import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { LoginResponse } from '../api/client';

const STORAGE_KEY = 'qt_auth';

export type AuthSession = {
  accessToken: string;
  email: string;
  roles: string[];
};

function loadSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as AuthSession;
    if (!o?.accessToken || !o.email) return null;
    return { accessToken: o.accessToken, email: o.email, roles: Array.isArray(o.roles) ? o.roles : [] };
  } catch {
    return null;
  }
}

type AuthContextValue = {
  isAuthenticated: boolean;
  accessToken: string | undefined;
  email: string | undefined;
  roles: string[];
  setSessionFromLogin: (r: LoginResponse) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => loadSession());

  const setSessionFromLogin = useCallback((r: LoginResponse) => {
    const s: AuthSession = { accessToken: r.accessToken, email: r.email, roles: r.roles };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    setSession(s);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setSession(null);
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    if (!session) {
      return {
        isAuthenticated: false,
        accessToken: undefined,
        email: undefined,
        roles: [],
        setSessionFromLogin,
        logout,
      };
    }
    return {
      isAuthenticated: true,
      accessToken: session.accessToken,
      email: session.email,
      roles: session.roles,
      setSessionFromLogin,
      logout,
    };
  }, [session, setSessionFromLogin, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const v = useContext(AuthContext);
  if (!v) throw new Error('useAuth must be used within AuthProvider');
  return v;
}

export const STAFF_ROLES = ['SuperAdmin', 'BanGiamHieu', 'GiaoVien', 'KeToan'] as const;

export function isStaffRole(roles: string[]) {
  return roles.some((r) => (STAFF_ROLES as readonly string[]).includes(r));
}
