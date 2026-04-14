import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Language } from '@/lib/i18n';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  isEmployee: boolean;
  isVolunteer: boolean;
  language: Language;
  setLanguage: (lang: Language) => void;
  darkMode: boolean;
  setDarkMode: (v: boolean) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEmployee, setIsEmployee] = useState(false);
  const [isVolunteer, setIsVolunteer] = useState(false);
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem('lang') as Language) || 'en');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');

  useEffect(() => { localStorage.setItem('lang', language); }, [language]);
  useEffect(() => {
    localStorage.setItem('darkMode', String(darkMode));
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => checkRoles(session.user.id), 0);
      } else {
        setIsAdmin(false); setIsEmployee(false); setIsVolunteer(false);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) checkRoles(session.user.id);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function checkRoles(userId: string) {
    const { data } = await supabase.from('user_roles').select('role').eq('user_id', userId);
    if (data) {
      setIsAdmin(data.some(r => r.role === 'admin'));
      setIsEmployee(data.some(r => r.role === 'employee'));
      setIsVolunteer(data.some(r => r.role === 'volunteer' as any));
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null); setSession(null);
    setIsAdmin(false); setIsEmployee(false); setIsVolunteer(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, isEmployee, isVolunteer, language, setLanguage, darkMode, setDarkMode, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be within AuthProvider');
  return ctx;
}
