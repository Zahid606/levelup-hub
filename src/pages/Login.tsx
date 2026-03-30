import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { t } from '@/lib/i18n';
import { toast } from 'sonner';
import { GraduationCap, LogIn, UserPlus } from 'lucide-react';

export default function Login() {
  const { language } = useAuth();
  const navigate = useNavigate();
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignup) {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: fullName } }
        });
        if (error) throw error;
        toast.success('Account created successfully!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate('/');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full gradient-primary opacity-10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full gradient-accent opacity-10 blur-3xl" />
      </div>
      
      <Card className="w-full max-w-md glass-card animate-scale-in relative">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto gradient-primary rounded-2xl p-4 w-fit">
            <GraduationCap className="h-8 w-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-heading">{isSignup ? t('auth.signup', language) : t('auth.login', language)}</CardTitle>
          <CardDescription>
            {isSignup ? 'Create your student account' : 'Welcome back to LearnHub'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignup && (
              <Input placeholder={t('auth.fullName', language)} value={fullName} onChange={e => setFullName(e.target.value)} required />
            )}
            <Input type="email" placeholder={t('auth.email', language)} value={email} onChange={e => setEmail(e.target.value)} required />
            <Input type="password" placeholder={t('auth.password', language)} value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
            <Button type="submit" className="w-full gradient-primary text-primary-foreground" disabled={loading}>
              {isSignup ? <><UserPlus className="h-4 w-4 mr-2" />{t('auth.signup', language)}</> : <><LogIn className="h-4 w-4 mr-2" />{t('auth.login', language)}</>}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            <button onClick={() => setIsSignup(!isSignup)} className="text-primary hover:underline">
              {isSignup ? t('auth.hasAccount', language) : t('auth.noAccount', language)}
            </button>
          </div>
          <div className="mt-2 text-center">
            <Link to="/admin-login" className="text-xs text-muted-foreground hover:text-foreground">
              {t('auth.adminLogin', language)} →
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
