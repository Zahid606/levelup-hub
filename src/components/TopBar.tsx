import { useAuth } from '@/contexts/AuthContext';
import { t, languageNames, type Language } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { LogOut, Moon, Sun, Trophy, Shield } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export function TopBar() {
  const { user, isAdmin, language, setLanguage, darkMode, setDarkMode, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-50 glass-card border-b border-border/50">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <img src="/logo.png" alt="Misk-ul-Kalam" className="h-10 w-10 rounded-full object-cover ring-2 ring-accent/50" />
          <span className="font-heading text-lg font-bold leading-tight">
            <span className="text-gradient">Misk-ul-Kalam</span>
          </span>
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
            {isAdmin && (
              <Link to="/admin" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                <Shield className="h-4 w-4" />
                {t('nav.admin', language)}
              </Link>
            )}
          </nav>
        )}

        <div className="flex items-center gap-3">
          <Select value={language} onValueChange={(v) => setLanguage(v as Language)}>
            <SelectTrigger className="w-[100px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(languageNames) as [Language, string][]).map(([code, name]) => (
                <SelectItem key={code} value={code}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1.5">
            <Sun className="h-3.5 w-3.5 text-muted-foreground" />
            <Switch checked={darkMode} onCheckedChange={setDarkMode} className="data-[state=checked]:bg-primary" />
            <Moon className="h-3.5 w-3.5 text-muted-foreground" />
          </div>

          {user && (
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-muted-foreground">
              <LogOut className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">{t('auth.logout', language)}</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
