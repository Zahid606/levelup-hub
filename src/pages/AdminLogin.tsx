import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { t } from '@/lib/i18n';
import { toast } from 'sonner';
import { Shield, LogIn, Eye, EyeOff } from 'lucide-react';

export default function AdminLogin() {
  const { language } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      
      // Check if user is admin
      const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', data.user.id);
      const isAdmin = roles?.some(r => r.role === 'admin');
      
      if (!isAdmin) {
        await supabase.auth.signOut();
        toast.error('Access denied. Admin accounts only.');
        return;
      }
      
      navigate('/admin');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-80 h-80 rounded-full gradient-accent opacity-10 blur-3xl" />
      </div>
      
      <Card className="w-full max-w-md glass-card animate-scale-in relative">
        <CardHeader className="text-center space-y-3">
          <div className="flex flex-col items-center gap-2">
            <div className="relative">
              <img src="/logo.png" alt="Misk-ul-Kalam" className="h-20 w-20 rounded-full object-cover ring-2 ring-accent/40 shadow-lg" />
              <div className="absolute -bottom-1 -right-1 bg-accent rounded-full p-1">
                <Shield className="h-3.5 w-3.5 text-white" />
              </div>
            </div>
            <div>
              <p className="font-heading font-bold text-lg text-gradient">Misk-ul-Kalam</p>
              <p className="text-xs text-muted-foreground">پیغام قرآن وسنت</p>
            </div>
          </div>
          <CardTitle className="text-xl font-heading">{t('auth.adminLogin', language)}</CardTitle>
          <CardDescription>Admin access only</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input type="email" placeholder={t('auth.email', language)} value={email} onChange={e => setEmail(e.target.value)} required />
            <div className="relative">
              <Input type={showPassword ? 'text' : 'password'} placeholder={t('auth.password', language)} value={password} onChange={e => setPassword(e.target.value)} required className="pr-10" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" tabIndex={-1}>
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Button type="submit" className="w-full gradient-accent text-accent-foreground" disabled={loading}>
              <LogIn className="h-4 w-4 mr-2" />
              {t('auth.adminLogin', language)}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <Link to="/login" className="text-xs text-muted-foreground hover:text-foreground">
              ← Student Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
