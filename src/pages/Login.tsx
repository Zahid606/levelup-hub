import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { t } from '@/lib/i18n';
import { toast } from 'sonner';
import { LogIn, UserPlus, Eye, EyeOff } from 'lucide-react';

const COUNTRIES = ['Pakistan', 'India', 'Bangladesh', 'Saudi Arabia', 'UAE', 'UK', 'USA', 'Canada', 'Australia', 'Malaysia', 'Turkey', 'Egypt', 'Indonesia', 'South Africa', 'Other'];

const SAUDI_CITIES = [
  'Riyadh', 'Jeddah', 'Makkah', 'Madinah', 'Dammam', 'Dhahran', 'Khobar', 'Tabuk',
  'Buraidah', 'Khamis Mushait', 'Abha', 'Taif', 'Hail', 'Najran', 'Jubail', 'Yanbu',
  'Al Ahsa', 'Arar', 'Sakaka', 'Jizan', 'Al Baha', 'Bisha', 'Unaizah', 'Qatif', 'Other'
];

export default function Login() {
  const { language } = useAuth();
  const navigate = useNavigate();
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('');
  const [age, setAge] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignup) {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            data: {
              full_name: fullName,
              gender,
              age: age ? parseInt(age) : null,
              city: city || null,
              country: country || null,
              phone: phone || null,
            }
          }
        });
        if (error) throw error;
        toast.success('Account created! Please check your email to verify.');
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
        <CardHeader className="text-center space-y-3">
          <div className="flex flex-col items-center gap-2">
            <img src="/logo.png" alt="Misk-ul-Kalam" className="h-20 w-20 rounded-full object-cover ring-2 ring-accent/40 shadow-lg" />
            <div>
              <p className="font-heading font-bold text-lg text-gradient">Misk-ul-Kalam</p>
              <p className="text-xs text-muted-foreground">پیغام قرآن وسنت</p>
            </div>
          </div>
          <CardTitle className="text-xl font-heading">{isSignup ? t('auth.signup', language) : t('auth.login', language)}</CardTitle>
          <CardDescription>
            {isSignup ? 'Create your student account' : 'Welcome back'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignup && (
              <>
                <Input placeholder={t('auth.fullName', language)} value={fullName} onChange={e => setFullName(e.target.value)} required />
                <Input type="tel" placeholder="Phone Number (e.g. +966...)" value={phone} onChange={e => setPhone(e.target.value)} />
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
                <Input type="number" placeholder="Age" min={1} max={120} value={age} onChange={e => setAge(e.target.value)} />
                <Select value={country} onValueChange={v => { setCountry(v); setCity(''); }}>
                  <SelectTrigger><SelectValue placeholder="Select Country" /></SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {country === 'Saudi Arabia' ? (
                  <Select value={city} onValueChange={setCity}>
                    <SelectTrigger><SelectValue placeholder="Select City" /></SelectTrigger>
                    <SelectContent>
                      {SAUDI_CITIES.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input placeholder="City" value={city} onChange={e => setCity(e.target.value)} />
                )}
              </>
            )}
            <Input type="email" placeholder={t('auth.email', language)} value={email} onChange={e => setEmail(e.target.value)} required />
            <div className="relative">
              <Input type={showPassword ? 'text' : 'password'} placeholder={t('auth.password', language)} value={password} onChange={e => setPassword(e.target.value)} required minLength={6} className="pr-10" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" tabIndex={-1}>
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
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
