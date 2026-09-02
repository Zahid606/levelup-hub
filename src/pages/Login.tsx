import { useState } from 'react';
import { useNavigate, Link } from '@/lib/router-compat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { t, type Language } from '@/lib/i18n';
import { toast } from 'sonner';

const COUNTRIES = ['Pakistan', 'India', 'Bangladesh', 'Saudi Arabia', 'UAE', 'UK', 'USA', 'Canada', 'Australia', 'Malaysia', 'Turkey', 'Egypt', 'Indonesia', 'South Africa', 'Other'];

const SAUDI_CITIES = [
  'Riyadh', 'Jeddah', 'Makkah', 'Madinah', 'Dammam', 'Dhahran', 'Khobar', 'Tabuk',
  'Buraidah', 'Khamis Mushait', 'Abha', 'Taif', 'Hail', 'Najran', 'Jubail', 'Yanbu',
  'Al Ahsa', 'Arar', 'Sakaka', 'Jizan', 'Al Baha', 'Bisha', 'Unaizah', 'Qatif', 'Other'
];

const selectClass = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2';

export default function Login() {
  const language = ((localStorage.getItem('lang') as Language) || 'en');
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
      const { supabase } = await import('@/integrations/supabase/client');
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
            <img src="/logo-small.webp" alt={t('site.name', language)} width="80" height="80" className="h-20 w-20 rounded-full object-cover ring-2 ring-accent/40 shadow-lg" />
            <div>
              <p className="font-heading font-bold text-lg text-gradient" dir={language === 'ur' ? 'rtl' : 'ltr'}>{t('site.name', language)}</p>
              <p className="text-xs text-muted-foreground" dir={language === 'ur' ? 'rtl' : 'ltr'}>{t('site.tagline', language)}</p>
            </div>
          </div>
          <CardTitle className="text-xl font-heading">{isSignup ? t('auth.signup', language) : t('auth.login', language)}</CardTitle>
          <CardDescription>
            {isSignup ? (language === 'ur' ? 'اپنا اسٹوڈنٹ اکاؤنٹ بنائیں' : language === 'bn' ? 'আপনার ছাত্র অ্যাকাউন্ট তৈরি করুন' : 'Create your student account') : t('general.welcome', language)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignup && (
              <>
                <Input placeholder={t('auth.fullName', language)} value={fullName} onChange={e => setFullName(e.target.value)} required />
                <Input type="tel" placeholder={t('login.phone', language)} value={phone} onChange={e => setPhone(e.target.value)} />
                <select className={selectClass} value={gender} onChange={e => setGender(e.target.value)}>
                  <option value="">{t('login.gender', language)}</option>
                  <option value="male">{t('login.male', language)}</option>
                  <option value="female">{t('login.female', language)}</option>
                </select>
                <Input type="number" placeholder={t('login.age', language)} min={1} max={120} value={age} onChange={e => setAge(e.target.value)} />
                <select className={selectClass} value={country} onChange={e => { setCountry(e.target.value); setCity(''); }}>
                  <option value="">{t('login.country', language)}</option>
                  {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {country === 'Saudi Arabia' ? (
                  <select className={selectClass} value={city} onChange={e => setCity(e.target.value)}>
                    <option value="">{t('login.city', language)}</option>
                    {SAUDI_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                ) : (
                  <Input placeholder={t('login.cityCustom', language)} value={city} onChange={e => setCity(e.target.value)} />
                )}
              </>
            )}
            <Input type="email" placeholder={t('auth.email', language)} value={email} onChange={e => setEmail(e.target.value)} required />
            <div className="relative">
              <Input type={showPassword ? 'text' : 'password'} placeholder={t('auth.password', language)} value={password} onChange={e => setPassword(e.target.value)} required minLength={6} className="pr-10" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors" tabIndex={-1}>
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <Button type="submit" className="w-full gradient-primary text-primary-foreground" disabled={loading}>
              {isSignup ? t('auth.signup', language) : t('auth.login', language)}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            <button onClick={() => setIsSignup(!isSignup)} className="text-primary hover:underline">
              {isSignup ? t('auth.hasAccount', language) : t('auth.signup', language)}
            </button>
          </div>
          <div className="mt-2 text-center">
            <Link to="/admin-login" className="text-xs text-muted-foreground hover:text-foreground">
              {t('auth.adminLogin', language)} →
            </Link>
          </div>
          <div className="mt-4 pt-4 border-t border-border text-center space-y-1">
            <p className="text-xs text-muted-foreground">Contact / رابطہ</p>
            <a href="tel:+966595229775" className="block text-sm font-medium text-primary hover:underline" dir="ltr">+966 595 229 775</a>
            <a href="tel:+966567035796" className="block text-sm font-medium text-primary hover:underline" dir="ltr">+966 567 035 796</a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
