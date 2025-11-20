import React, { useState, useEffect } from 'react';
import { useSettings as usePharmacySettings } from '@/Pharmacy contexts/PharmacySettingsContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck, Pill, Eye, EyeOff, Home } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { loginUser } from '@/Pharmacy services/userService';
import { useAuditLog } from '@/Pharmacy contexts/AuditLogContext';
import { Link } from 'react-router-dom';

interface LoginFormProps {
  onLogin: (user: any) => void;
  isUrdu: boolean;
  setIsUrdu: (value: boolean) => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLogin, isUrdu, setIsUrdu }) => {
  const { settings: ctxSettings } = usePharmacySettings();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { logAction } = useAuditLog();
  const { toast } = useToast();
  const [companyName, setCompanyName] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('pharmacy_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        const name = parsed?.companyName || parsed?.company?.name || parsed?.name;
        if (name) return String(name);
      }
    } catch {}
    return 'Pharmacy Management System';
  });

  const t = {
    en: {
      title: companyName,
      subtitle: 'Sign in to your account',
      username: 'Username',
      password: 'Password',
      login: 'Sign In',
      success: 'Login successful',
      redirecting: 'Redirecting to dashboard...',
      invalid: 'Invalid username or password',
    },
    ur: {
      title: 'فارمیسی منیجمنٹ سسٹم',
      subtitle: 'اپنے اکاؤنٹ میں لاگ ان کریں',
      username: 'صارف نام',
      password: 'پاس ورڈ',
      login: 'لاگ ان',
      success: 'کامیابی سے لاگ ان ہوگیا',
      redirecting: 'ڈیش بورڈ پر منتقل کیا جا رہا ہے...',
      invalid: 'غلط صارف نام یا پاس ورڈ',
    },
  }['en'];

  useEffect(() => {
    // If context has a companyName, prefer it
    const name = ctxSettings?.companyName;
    if (name) setCompanyName(String(name));
  }, [ctxSettings?.companyName]);

  useEffect(() => {
    (async () => {
      try {
        // Try pharmacy-specific settings first
        const resPh = await fetch(`/api/pharmacy/settings?ts=${Date.now()}`, { cache: 'no-store' as any });
        if (resPh.ok) {
          const json = await resPh.json();
          const name = json?.companyName || json?.company?.name || json?.name || json?.settings?.companyName;
          if (name) { setCompanyName(String(name)); return; }
        }
        // Fallback to hospital settings
        const res = await fetch(`/api/settings?ts=${Date.now()}`, { cache: 'no-store' as any });
        if (res.ok) {
          const json = await res.json();
          const name = json?.companyName || json?.hospitalName || json?.name || json?.settings?.companyName;
          if (name) { setCompanyName(String(name)); }
        }
      } catch {}
    })();
  }, []);

    const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await loginUser(username, password);
      const user = response.user || response; // The user object might be nested

      // Ensure the user object has the fields required by the AuthContext
      const userForContext = {
        id: user._id || user.id,
        name: user.name || user.username,
        role: user.role,
        ...user, // include any other properties
      };

      onLogin(userForContext);

      toast({ title: t.success, description: t.redirecting });
      logAction('LOGIN', `${user.username} logged in`, 'user', user._id || user.id);
    } catch (err: any) {
      toast({
        title: err.message || t.invalid,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-white p-4">
        {/* Home icon to navigate back to the main portal */}
        <Link to="/" className="absolute top-5 right-5 text-gray-500 hover:text-gray-700" aria-label="Go to portal">
          <Home size={24} />
        </Link>
        {/* Clean login: no decorative background */}
      <Card className="w-full max-w-md hover:shadow-2xl hover:scale-105 transition duration-300 ease-in-out">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-600 p-3 rounded-full">
              <Pill className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">{t.title}</CardTitle>
          <p className="text-gray-600">{t.subtitle}</p>
          <div className="flex justify-center mt-4">
            <Button variant="default" size="sm" onClick={() => setIsUrdu(false)}>English</Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">{t.username}</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t.password}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-2 flex items-center text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              <ShieldCheck className="mr-2 h-4 w-4" />
              {loading ? 'Signing in…' : t.login}
            </Button>
          </form>
        </CardContent>
        
      </Card>
      <footer className="w-full absolute bottom-4 left-0 flex justify-center pointer-events-none">
        <span className="text-xs font-semibold text-gray-700 bg-white/70 dark:bg-black/70 backdrop-blur rounded-md px-3 py-1 shadow">© {new Date().getFullYear()} {companyName}</span>
      </footer>
    </div>
  );
};

export default LoginForm;
