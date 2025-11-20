import { useState, useEffect } from "react";
import { UserRole } from "@/lab types/user";
import { Eye, EyeOff, User, Lock, Home } from "lucide-react";
import { Link } from "react-router-dom";

interface LoginFormProps {
  onLogin: (role: UserRole) => void;
  onShowSignup: () => void;
}

const LoginForm = ({ onLogin, onShowSignup }: LoginFormProps) => {
  // role will now be determined by backend response

  const [showPassword, setShowPassword] = useState(false);
  const [credentials, setCredentials] = useState({
    username: "",
    password: ""
  });
  const [labName, setLabName] = useState("Mindspire Hospital POS");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/lab/settings");
        if (!res.ok) return;
        const json = await res.json();
        const name = json?.lab?.labName || json?.labName;
        if (name && typeof name === 'string') setLabName(name);
      } catch {}
    })();
  }, []);

  /* Role selection array removed

    { 
      value: "lab-technician" as UserRole, 
      label: "Lab Technician", 
      color: "bg-gradient-to-r from-blue-500 to-blue-600",
      icon: Microscope,
      description: "Manage samples & tests"
    },
    { 
      value: "doctor" as UserRole, 
      label: "Doctor", 
      color: "bg-gradient-to-r from-green-500 to-green-600",
      icon: Stethoscope,
      description: "Request tests & review results"
    },
    { 
      value: "patient" as UserRole, 
      label: "Patient", 
      color: "bg-gradient-to-r from-purple-500 to-purple-600",
      icon: User,
      description: "View reports & book appointments"
    },
    { 
      value: "researcher" as UserRole, 
      label: "Researcher", 
      color: "bg-gradient-to-r from-orange-500 to-orange-600",
      icon: FlaskConical,
  */

const handleLogin = async () => {
    if (!credentials.username || !credentials.password) return;

    try {
      // Use Vite proxy to backend (vite.config.ts proxies /api -> http://localhost:5002)
      // Backend mounts lab auth at /api/lab/auth
      const res = await fetch("/api/lab/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: credentials.username,
          password: credentials.password,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        const mappedRole = data.role === "labTech" ? "lab-technician" : data.role;
        onLogin(mappedRole as UserRole);
      } else {
        throw new Error('Login failed');
      }
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLogin();
  };

  return (
    <div className="min-h-screen flex items-start justify-center bg-gradient-to-b from-white via-white to-indigo-50 transition-all duration-200 relative pt-16 sm:pt-24 pb-12">
      {/* Home icon to navigate back to the portal */}
      <Link to="/" className="absolute top-5 right-5 text-gray-500 hover:text-gray-700 transition-colors" aria-label="Go to portal">
        <Home size={28} />
      </Link>

      <div className="w-full max-w-sm mx-auto">
        <div className="mb-6 text-center flex flex-col items-center">
          <div className="text-5xl md:text-6xl font-extrabold font-poppins tracking-tight drop-shadow-lg bg-gradient-to-r from-indigo-800 via-indigo-700 to-blue-600 bg-clip-text text-transparent select-none">
            {labName}
          </div>
          <div className="mt-2 text-sm text-indigo-700 font-medium">Hospital Management System</div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/95 backdrop-blur rounded-3xl shadow-2xl border border-indigo-100 px-7 py-8 space-y-6">
          <div className="space-y-2">
            <label htmlFor="username" className="text-sm font-semibold text-gray-800">Username</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-300" size={18} />
              <input
                id="username"
                type="text"
                value={credentials.username}
                onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                placeholder="Enter your username"
                required
                className="w-full pl-12 pr-4 h-12 text-base rounded-2xl border border-indigo-200 focus:border-indigo-500 bg-white shadow-sm focus:shadow-indigo-100 outline-none transition-all font-medium placeholder:text-indigo-300"
                autoFocus
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-semibold text-gray-800">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-300" size={18} />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={credentials.password}
                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                placeholder="Enter your password"
                required
                className="w-full pl-12 pr-12 h-12 text-base rounded-2xl border border-indigo-200 focus:border-indigo-500 bg-white shadow-sm focus:shadow-indigo-100 outline-none transition-all font-medium placeholder:text-indigo-300"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full border border-indigo-200/80 flex items-center justify-center text-indigo-500 hover:text-indigo-600 hover:border-indigo-300 transition-colors focus:outline-none"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-4 rounded-xl text-base font-bold tracking-wide text-white bg-gradient-to-r from-indigo-800 via-indigo-700 to-blue-600 hover:from-blue-700 hover:to-indigo-800 shadow-md hover:shadow-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-offset-2 disabled:opacity-50"
            disabled={!credentials.username || !credentials.password}
          >
            Login
          </button>
          <div className="text-center text-indigo-700 text-xs mt-2">© {new Date().getFullYear()} {labName}. All rights reserved.</div>
        </form>
      </div>
    </div>
  );
};

export default LoginForm;
