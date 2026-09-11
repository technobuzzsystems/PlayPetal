import React, { useState } from 'react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Lock, User, AlertCircle, Eye, EyeOff } from 'lucide-react';

export const Login: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    setTimeout(() => {
      const result = login(identifier, password);
      setLoading(false);

      if (result.success) {
        showToast('Login successful! Welcome to KidsPlay.', 'success');
        // If a shopkeeper logs in here, direct to vendor portal
        const isVendorUser = result.role === 'VENDOR';
        const defaultDest = isVendorUser ? '/vendor-portal' : '/admin/dashboard';
        const origin = (location.state as any)?.from?.pathname || defaultDest;
        navigate(origin, { replace: true });
      } else {
        setError(result.message || 'Invalid username or password.');
      }
    }, 400);
  };

  return (
    <div className="min-h-screen bg-[#FFFDF9] flex flex-col items-center justify-center p-4 sm:p-6 text-slate-900 font-sans">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-8">
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-bold text-rose-900">
            <span>🏬</span>
            <span>Are you a Toy Shopkeeper?</span>
          </div>
          <Link
            to="/vendor/login"
            className="font-extrabold text-[#D90429] hover:text-[#B7092B] underline text-xs"
          >
            Shopkeeper Portal &rarr;
          </Link>
        </div>

        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-[#D90429] flex items-center justify-center text-white font-black text-2xl shadow-md shadow-[#D90429]/20 mb-3">
            K
          </div>
          <h2 className="text-2xl font-black text-[#202124] tracking-tight">KidsPlay Admin</h2>
          <span className="text-xs font-extrabold text-[#D90429] tracking-widest uppercase mt-0.5">
            Admin Panel Login
          </span>
          <p className="text-xs text-slate-500 mt-2 font-medium">
            Enter your credentials to access store management
          </p>
        </div>

        {/* Error Notice */}
        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-600 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-bold">{error}</div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4" autoComplete="off">
          {/* Hidden inputs to prevent aggressive browser autofill */}
          <div className="sr-only" aria-hidden="true">
            <input type="text" name="fake_username_to_prevent_autofill" tabIndex={-1} autoComplete="off" />
            <input type="password" name="fake_password_to_prevent_autofill" tabIndex={-1} autoComplete="new-password" />
          </div>

          <Input
            label="Username or Email"
            type="text"
            name="kidsplay_admin_user"
            id="kidsplay_admin_user"
            autoComplete="off"
            placeholder="Enter username or email"
            value={identifier}
            onChange={(e) => {
              setIdentifier(e.target.value);
              setError(null);
            }}
            leftIcon={<User className="w-4 h-4" />}
            required
          />

          <Input
            label="Password"
            type={showPassword ? "text" : "password"}
            name="kidsplay_admin_pass"
            id="kidsplay_admin_pass"
            autoComplete="new-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(null);
            }}
            leftIcon={<Lock className="w-4 h-4" />}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-slate-400 hover:text-slate-600 focus:outline-none transition-colors cursor-pointer p-0.5"
                tabIndex={-1}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
            required
          />

          <div className="pt-2">
            <Button
              type="submit"
              size="lg"
              className="w-full text-xs font-semibold py-2.5"
              isLoading={loading}
            >
              Sign In to Admin Panel
            </Button>
          </div>
        </form>
      </div>

      <p className="text-xs text-slate-400 mt-6 text-center font-medium">
        © 2026 KidsPlay E-Commerce Store • Admin Panel
      </p>
    </div>
  );
};
