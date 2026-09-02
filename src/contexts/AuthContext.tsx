import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Language } from '@/lib/i18n';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  isManager: boolean;
  isEmployee: boolean;
  isVolunteer: boolean;
  language: Language;
  setLanguage: (lang: Language) => void;
  darkMode: boolean;
  setDarkMode: (v: boolean) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ROLE_CACHE_TTL = 5 * 60 * 1000;

type RoleState = Pick<AuthContextType, 'isAdmin' | 'isManager' | 'isEmployee' | 'isVolunteer'>;

const emptyRoles: RoleState = { isAdmin: false, isManager: false, isEmployee: false, isVolunteer: false };

function readRoleCache(userId: string): RoleState | null {
  try {
    const raw = sessionStorage.getItem(`roles:${userId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RoleState & { cachedAt: number };
    if (!parsed.cachedAt || Date.now() - parsed.cachedAt > ROLE_CACHE_TTL) return null;
    return {
      isAdmin: !!parsed.isAdmin,
      isManager: !!parsed.isManager,
      isEmployee: !!parsed.isEmployee,
      isVolunteer: !!parsed.isVolunteer,
    };
  } catch {
    return null;
  }
}

function writeRoleCache(userId: string, roles: RoleState) {
  try { sessionStorage.setItem(`roles:${userId}`, JSON.stringify({ ...roles, cachedAt: Date.now() })); } catch {}
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isManager, setIsManager] = useState(false);
  const [isEmployee, setIsEmployee] = useState(false);
  const [isVolunteer, setIsVolunteer] = useState(false);
  const [language, setLanguage] = useState<Language>(() =>
    typeof window !== 'undefined' ? ((localStorage.getItem('lang') as Language) || 'en') : 'en',
  );
  const [darkMode, setDarkMode] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem('darkMode') === 'true' : false,
  );
  const lastUserIdRef = useRef<string | null>(null);

  useEffect(() => { localStorage.setItem('lang', language); }, [language]);
  useEffect(() => {
    localStorage.setItem('darkMode', String(darkMode));
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  useEffect(() => {
    let active = true;

    const applySession = async (session: Session | null) => {
      if (!active) return;
      setLoading(true);
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await checkRoles(session.user.id, lastUserIdRef.current !== session.user.id);
        lastUserIdRef.current = session.user.id;
      } else {
        lastUserIdRef.current = null;
        applyRoles(emptyRoles);
      }
      if (active) setLoading(false);
    };

    supabase.auth.getSession().then(({ data: { session } }) => applySession(session));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') return;
      void applySession(session);
    });

    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  function applyRoles(roles: RoleState) {
    setIsAdmin(roles.isAdmin);
    setIsManager(roles.isManager);
    setIsEmployee(roles.isEmployee);
    setIsVolunteer(roles.isVolunteer);
  }

  async function checkRoles(userId: string, forceRefresh = false) {
    if (!forceRefresh) {
      const cached = readRoleCache(userId);
      if (cached) { applyRoles(cached); return; }
    }
    const { data } = await supabase.from('user_roles').select('role').eq('user_id', userId);
    if (data) {
      const roles = {
        isAdmin: data.some(r => r.role === 'admin'),
        isManager: data.some(r => (r.role as any) === 'manager'),
        isEmployee: false,
        isVolunteer: data.some(r => r.role === 'volunteer' as any),
      };
      applyRoles(roles);
      writeRoleCache(userId, roles);
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null); setSession(null);
    lastUserIdRef.current = null;
    applyRoles(emptyRoles);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, isManager, isEmployee, isVolunteer, language, setLanguage, darkMode, setDarkMode, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be within AuthProvider');
  return ctx;
}
