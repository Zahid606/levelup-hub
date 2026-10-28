import logoImg from '@/assets/logo-small.webp';
import { useAuth } from '@/contexts/AuthContext';
import { t, languageNames, type Language } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LogOut, Moon, Sun, Trophy, Shield, Mail, BookOpen, MessageSquare } from 'lucide-react';
import { Link, useNavigate } from '@/lib/router-compat';
import { ProfileSettings } from '@/components/ProfileSettings';
import { NotificationBell } from '@/components/NotificationBell';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';



function UnreadBadge({ count, className = '' }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span
      className={`flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold leading-none text-accent-foreground ${className}`}
      aria-label={`${count} unread messages`}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

export function TopBar() {
  const unreadMessages = useUnreadMessages();
  const { user, isAdmin, isManager, isEmployee, isVolunteer, language, setLanguage, darkMode, setDarkMode, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-card/70 backdrop-blur-xl backdrop-saturate-150">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <img src={logoImg} alt={t('site.name', language)} className="h-10 w-10 rounded-full object-cover " />
          <span className="hidden xl:inline text-sm font-semibold text-foreground" dir={language === 'ur' ? 'rtl' : 'ltr'}>{t('site.name', language)}</span>
        </Link>

        {user && (
          <nav className="hidden lg:flex items-center gap-1">
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors rounded-full px-3 py-1.5">
              {t('nav.lessons', language)}
            </Link>
            <Link to="/leaderboard" className="text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center gap-1.5 rounded-full px-3 py-1.5">
              <Trophy className="h-3.5 w-3.5" />
              {t('nav.leaderboard', language)}
            </Link>
            <Link to="/messages" className="text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center gap-1.5 rounded-full px-3 py-1.5">
              <MessageSquare className="h-3.5 w-3.5" />
              {t('nav.messages', language)}
              <UnreadBadge count={unreadMessages} />
            </Link>
            <Link to="/contact" className="text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center gap-1.5 rounded-full px-3 py-1.5">
              <Mail className="h-3.5 w-3.5" />
              {t('nav.contact', language)}
            </Link>
            {(isAdmin || isManager || isEmployee || isVolunteer) && (
              <Link to="/admin" className="text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center gap-1.5 rounded-full px-3 py-1.5">
                <Shield className="h-3.5 w-3.5" />
                {t('nav.admin', language)}
              </Link>
            )}
          </nav>
        )}

        <div className="flex items-center gap-2">


          <Select value={language} onValueChange={(v) => setLanguage(v as Language)}>
            <SelectTrigger className="w-[90px] h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(languageNames) as [Language, string][]).map(([code, name]) => (
                <SelectItem key={code} value={code}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <button
            type="button"
            role="switch"
            aria-checked={darkMode}
            aria-label="Toggle dark mode"
            onClick={() => setDarkMode(!darkMode)}
            className={`relative h-7 w-14 shrink-0 rounded-full border transition-colors duration-300 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring ${
              darkMode ? 'border-transparent bg-accent' : 'border-transparent bg-foreground/15'
            }`}
          >
            <Sun className={`absolute left-1.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white transition-opacity duration-300 ${darkMode ? 'opacity-40' : 'opacity-0'}`} />
            <Moon className={`absolute right-1.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-foreground/50 transition-opacity duration-300 ${darkMode ? 'opacity-0' : 'opacity-40'}`} />
            <span
              className={`absolute top-0.5 flex h-6 w-6 items-center justify-center rounded-full shadow-md transition-all duration-300 ${
                darkMode ? 'left-[1.75rem] bg-white text-neutral-900' : 'left-0.5 bg-white text-neutral-900'
              }`}
            >
              {darkMode ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
            </span>
          </button>

          {user && (
            <>
              <NotificationBell />
              <ProfileSettings />

              <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-muted-foreground">
                <LogOut className="h-4 w-4 mr-1" />
                <span className="hidden xl:inline">{t('auth.logout', language)}</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {user && (
        <nav className="lg:hidden flex items-center justify-around border-t border-border/50 bg-background/40 backdrop-blur px-2 py-1.5">
          <Link to="/" className="flex flex-col items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1">
            <BookOpen className="h-4 w-4" />
            {t('nav.lessons', language)}
          </Link>
          <Link to="/leaderboard" className="flex flex-col items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1">
            <Trophy className="h-3.5 w-3.5" />
            {t('nav.leaderboard', language)}
          </Link>
          <Link to="/messages" className="flex flex-col items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1">
            <span className="relative">
              <MessageSquare className="h-3.5 w-3.5" />
              <UnreadBadge count={unreadMessages} className="absolute -right-3 -top-2" />
            </span>
            {t('nav.messages', language)}
          </Link>
          <Link to="/contact" className="flex flex-col items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1">
            <Mail className="h-3.5 w-3.5" />
            {t('nav.contact', language)}
          </Link>
          {(isAdmin || isManager || isEmployee || isVolunteer) && (
            <Link to="/admin" className="flex flex-col items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1">
              <Shield className="h-3.5 w-3.5" />
              {t('nav.admin', language)}
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}
