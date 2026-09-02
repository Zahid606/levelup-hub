import logoImg from '@/assets/logo-small.webp';
import { useAuth } from '@/contexts/AuthContext';
import { t, languageNames, type Language } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { LogOut, Moon, Sun, Trophy, Shield, Mail, BookOpen, MessageSquare } from 'lucide-react';
import { Link, useNavigate } from '@/lib/router-compat';
import { ProfileSettings } from '@/components/ProfileSettings';
import { NotificationBell } from '@/components/NotificationBell';



export function TopBar() {
  const { user, isAdmin, isManager, isEmployee, isVolunteer, language, setLanguage, darkMode, setDarkMode, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-50 glass-card border-b border-border/50">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <img src={logoImg} alt={t('site.name', language)} className="h-10 w-10 rounded-full object-cover ring-2 ring-accent/50" />
          <span className="hidden md:inline text-sm font-semibold text-foreground" dir={language === 'ur' ? 'rtl' : 'ltr'}>{t('site.name', language)}</span>
        </Link>

        {user && (
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              {t('nav.lessons', language)}
            </Link>
            <Link to="/leaderboard" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              <Trophy className="h-4 w-4" />
              {t('nav.leaderboard', language)}
            </Link>
            <Link to="/messages" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              <MessageSquare className="h-4 w-4" />
              {t('nav.messages', language)}
            </Link>
            <Link to="/contact" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              <Mail className="h-4 w-4" />
              {t('nav.contact', language)}
            </Link>
            {(isAdmin || isManager || isEmployee || isVolunteer) && (
              <Link to="/admin" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                <Shield className="h-4 w-4" />
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

          <div className="flex items-center gap-1">
            <Sun className="h-3 w-3 text-muted-foreground" />
            <Switch checked={darkMode} onCheckedChange={setDarkMode} className="h-4 w-8 data-[state=checked]:bg-primary [&>span]:h-3 [&>span]:w-3 [&>span]:data-[state=checked]:translate-x-4" />
            <Moon className="h-3 w-3 text-muted-foreground" />
          </div>

          {user && (
            <>
              <NotificationBell />
              <ProfileSettings />

              <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-muted-foreground">
                <LogOut className="h-4 w-4 mr-1" />
                <span className="hidden md:inline">{t('auth.logout', language)}</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {user && (
        <nav className="md:hidden flex items-center justify-around border-t border-border/50 bg-background/40 backdrop-blur px-2 py-1.5">
          <Link to="/" className="flex flex-col items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1">
            <BookOpen className="h-4 w-4" />
            {t('nav.lessons', language)}
          </Link>
          <Link to="/leaderboard" className="flex flex-col items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1">
            <Trophy className="h-4 w-4" />
            {t('nav.leaderboard', language)}
          </Link>
          <Link to="/messages" className="flex flex-col items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1">
            <MessageSquare className="h-4 w-4" />
            {t('nav.messages', language)}
          </Link>
          <Link to="/contact" className="flex flex-col items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1">
            <Mail className="h-4 w-4" />
            {t('nav.contact', language)}
          </Link>
          {(isAdmin || isManager || isEmployee || isVolunteer) && (
            <Link to="/admin" className="flex flex-col items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1">
              <Shield className="h-4 w-4" />
              {t('nav.admin', language)}
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}
