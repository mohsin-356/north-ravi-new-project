import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useIndoorAuth } from '@/Indoor contexts/AuthContext';
import { useIndoorSettings } from '@/Indoor contexts/SettingsContext';
import { Pill, Eye, EyeOff, ShieldCheck, Home } from 'lucide-react';

const IndoorLogin: React.FC = () => {
  const { login } = useIndoorAuth();
  const { settings } = useIndoorSettings();
  const nav = useNavigate();
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [show, setShow] = React.useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setLoading(true);
    try {
      await login(username, password);
      nav('/indoor-pharmacy', { replace: true });
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Link to="/" className="fixed top-4 right-6 text-blue-800 hover:text-blue-900" title="Back to Portal">
        <Home className="h-6 w-6" />
      </Link>
      <form onSubmit={onSubmit} className="w-full max-w-md p-8 rounded-xl border bg-white shadow-sm space-y-5">
        <div className="flex flex-col items-center gap-2">
          <div className="h-14 w-14 rounded-full bg-blue-800 flex items-center justify-center text-white">
            <Pill className="h-7 w-7" />
          </div>
          <div className="text-2xl font-semibold">{settings.companyName || 'PharmaCare'}</div>
          <div className="text-sm text-gray-500">Sign in to your account</div>
          <button type="button" className="px-3 py-1 rounded bg-blue-800 text-white text-sm">English</button>
        </div>

        <div>
          <label className="text-sm block mb-1">Username</label>
          <input className="border rounded px-3 py-2 w-full" value={username} onChange={e=>setUsername(e.target.value)} autoFocus />
        </div>
        <div>
          <label className="text-sm block mb-1">Password</label>
          <div className="relative">
            <input type={show ? 'text' : 'password'} className="border rounded px-3 py-2 w-full pr-10" value={password} onChange={e=>setPassword(e.target.value)} />
            <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500" onClick={()=>setShow(s=>!s)} aria-label="Toggle Password">
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        {err && <div className="text-sm text-red-600">{err}</div>}
        <button type="submit" className="w-full py-2 rounded bg-blue-800 hover:bg-blue-900 text-white inline-flex items-center justify-center gap-2" disabled={loading}>
          <ShieldCheck className="h-4 w-4" /> {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
    </div>
  );
};

export default IndoorLogin;
