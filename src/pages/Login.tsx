import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useAuth } from '@/contexts/AuthContext';
import { t } from '@/lib/i18n';
import { toast } from 'sonner';
import { LogIn, UserPlus, Mail, Phone, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const { language } = useAuth();
  const navigate = useNavigate();
  const [isSignup, setIsSignup] = useState(false);
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [gender, setGender] = useState('');
  const [age, setAge] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignup) {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: fullName, gender, age: age ? parseInt(age) : null, city: city || null, country: country || null } }
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

  const handleSendOtp = async () => {
    if (!phone) { toast.error('Please enter a phone number'); return; }
    setLoading(true);
    try {
      if (isSignup) {
        const { error } = await supabase.auth.signUp({
          phone,
          password: Math.random().toString(36).slice(-10),
          options: { data: { full_name: fullName, gender, age: age ? parseInt(age) : null, city: city || null, country: country || null } }
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithOtp({ phone });
        if (error) throw error;
      }
      setOtpSent(true);
      toast.success('OTP sent to your phone!');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) { toast.error('Please enter a 6-digit OTP'); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone,
        token: otp,
        type: isSignup ? 'sms' : 'sms',
      });
      if (error) throw error;
      // Update profile with gender/age after signup
      if (isSignup) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('profiles').update({ gender: gender || null, age: age ? parseInt(age) : null } as any).eq('user_id', user.id);
        }
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
          {/* Auth method toggle */}
          <div className="flex gap-2 mb-4">
            <Button
              type="button"
              variant={authMethod === 'email' ? 'default' : 'outline'}
              className={`flex-1 ${authMethod === 'email' ? 'gradient-primary text-primary-foreground' : ''}`}
              onClick={() => { setAuthMethod('email'); setOtpSent(false); }}
            >
              <Mail className="h-4 w-4 mr-1" /> Email
            </Button>
            <Button
              type="button"
              variant={authMethod === 'phone' ? 'default' : 'outline'}
              className={`flex-1 ${authMethod === 'phone' ? 'gradient-primary text-primary-foreground' : ''}`}
              onClick={() => { setAuthMethod('phone'); setOtpSent(false); }}
            >
              <Phone className="h-4 w-4 mr-1" /> Phone
            </Button>
          </div>

          {authMethod === 'email' ? (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              {isSignup && (
                <>
                  <Input placeholder={t('auth.fullName', language)} value={fullName} onChange={e => setFullName(e.target.value)} required />
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
                  <Input placeholder="City" value={city} onChange={e => setCity(e.target.value)} />
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger><SelectValue placeholder="Select Country" /></SelectTrigger>
                    <SelectContent>
                      {['Pakistan', 'India', 'Bangladesh', 'Saudi Arabia', 'UAE', 'UK', 'USA', 'Canada', 'Australia', 'Malaysia', 'Turkey', 'Egypt', 'Indonesia', 'South Africa', 'Other'].map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
          ) : (
            <div className="space-y-4">
              {isSignup && !otpSent && (
                <>
                  <Input placeholder={t('auth.fullName', language)} value={fullName} onChange={e => setFullName(e.target.value)} required />
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
                  <Input placeholder="City" value={city} onChange={e => setCity(e.target.value)} />
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger><SelectValue placeholder="Select Country" /></SelectTrigger>
                    <SelectContent>
                      {['Pakistan', 'India', 'Bangladesh', 'Saudi Arabia', 'UAE', 'UK', 'USA', 'Canada', 'Australia', 'Malaysia', 'Turkey', 'Egypt', 'Indonesia', 'South Africa', 'Other'].map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}
              <Input
                type="tel"
                placeholder="+1234567890"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                disabled={otpSent}
              />
              {otpSent ? (
                <>
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-sm text-muted-foreground">Enter the 6-digit code sent to your phone</p>
                    <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  <Button onClick={handleVerifyOtp} className="w-full gradient-primary text-primary-foreground" disabled={loading}>
                    Verify OTP
                  </Button>
                  <Button variant="ghost" className="w-full" onClick={() => { setOtpSent(false); setOtp(''); }}>
                    Change phone number
                  </Button>
                </>
              ) : (
                <Button onClick={handleSendOtp} className="w-full gradient-primary text-primary-foreground" disabled={loading}>
                  {isSignup ? <><UserPlus className="h-4 w-4 mr-2" />Send OTP & Sign Up</> : <><LogIn className="h-4 w-4 mr-2" />Send OTP</>}
                </Button>
              )}
            </div>
          )}

          <div className="mt-4 text-center text-sm">
            <button onClick={() => { setIsSignup(!isSignup); setOtpSent(false); setOtp(''); }} className="text-primary hover:underline">
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
