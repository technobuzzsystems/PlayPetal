import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  Store,
  User,
  Mail,
  Phone,
  MapPin,
  Lock,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const VendorAuth: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'register' ? 'register' : 'login';
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(initialTab);

  const { login, registerVendor } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [loginId, setLoginId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loadingLogin, setLoadingLogin] = useState(false);

  const [regForm, setRegForm] = useState({
    shopName: '',
    name: '',
    email: '',
    phone: '',
    city: 'Mumbai',
    password: '',
    description: '',
  });
  const [regError, setRegError] = useState<string | null>(null);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [loadingReg, setLoadingReg] = useState(false);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoadingLogin(true);

    setTimeout(() => {
      const res = login(loginId, loginPassword);
      setLoadingLogin(false);
      if (res.success) {
        showToast('Welcome back to your Shopkeeper Dashboard! 🏬', 'success');
        navigate('/vendor-portal', { replace: true });
      } else {
        setLoginError(res.message || 'Invalid shopkeeper credentials.');
      }
    }, 300);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);

    if (!regForm.shopName || !regForm.name || !regForm.email || !regForm.password) {
      setRegError('Please complete all required fields marked with *');
      return;
    }

    setLoadingReg(true);
    try {
      const res = await registerVendor(regForm);
      setLoadingReg(false);
      if (res.success) {
        showToast('Congratulations! Your Toy Shop is registered 🎉', 'success', 'You can now start listing toys.');
        navigate('/vendor-portal', { replace: true });
      } else {
        setRegError(res.message || 'Registration failed.');
      }
    } catch (err: any) {
      setLoadingReg(false);
      setRegError(err?.message || 'Server error during registration.');
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFDF9] flex flex-col items-center justify-center p-4 sm:p-6 font-sans text-slate-900">
      <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-8 relative">
        
        {/* Top Header Identity */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-[#D90429] flex items-center justify-center text-white shadow-md shadow-[#D90429]/20 mb-3">
            <Store size={32} />
          </div>
          <span className="bg-rose-50 text-[#D90429] border border-rose-200 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider mb-1 flex items-center gap-1">
            <Sparkles size={12} className="text-[#D90429]" /> Multi-Vendor Partner Portal
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-[#202124] tracking-tight">
            Play Petal Shopkeeper Portal
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-sm font-medium">
            Manage your store catalog, upload photos directly with drag-and-drop, and fulfill customer orders.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1.5 bg-slate-100 border border-slate-200 rounded-2xl mb-6">
          <button
            type="button"
            onClick={() => {
              setActiveTab('login');
              setLoginError(null);
            }}
            className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'login'
                ? 'bg-[#D90429] text-white shadow-sm font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Shopkeeper Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('register');
              setRegError(null);
            }}
            className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'register'
                ? 'bg-[#D90429] text-white shadow-sm font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Register My Shop (New)
          </button>
        </div>

        {/* TAB 1: LOGIN */}
        {activeTab === 'login' && (
          <div className="space-y-4">

            {loginError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-600 flex items-center gap-2">
                <AlertCircle size={15} className="text-rose-600 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-3.5" autoComplete="off">
              {/* Hidden inputs to prevent aggressive browser autofill */}
              <div className="sr-only" aria-hidden="true">
                <input type="text" name="fake_vendor_user" tabIndex={-1} autoComplete="off" />
                <input type="password" name="fake_vendor_pass" tabIndex={-1} autoComplete="new-password" />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Shopkeeper Username or Email *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    required
                    type="text"
                    name="vendor_login_id"
                    id="vendor_login_id"
                    autoComplete="off"
                    placeholder="Enter your username or email"
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#D90429]/30 focus:border-[#D90429]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    required
                    type={showLoginPassword ? "text" : "password"}
                    name="vendor_login_pass"
                    id="vendor_login_pass"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#D90429]/30 focus:border-[#D90429]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors cursor-pointer p-0.5"
                    tabIndex={-1}
                    title={showLoginPassword ? "Hide password" : "Show password"}
                  >
                    {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loadingLogin}
                className="w-full bg-[#D90429] hover:bg-[#B7092B] text-white py-3 rounded-2xl font-black text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 cursor-pointer"
              >
                {loadingLogin ? 'Signing In...' : 'Sign In to Shopkeeper Panel 🏬'}
              </button>
            </form>

            <div className="text-center pt-2">
              <span className="text-xs text-slate-500">Don't have a shopkeeper account yet? </span>
              <button
                type="button"
                onClick={() => setActiveTab('register')}
                className="text-xs font-black text-[#D90429] hover:underline cursor-pointer"
              >
                Register Your Toy Shop &rarr;
              </button>
            </div>

          </div>
        )}

        {/* TAB 2: REGISTER */}
        {activeTab === 'register' && (
          <div className="space-y-4">
            
            {regError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-600 flex items-center gap-2">
                <AlertCircle size={15} className="text-rose-600 shrink-0" />
                <span>{regError}</span>
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="space-y-3" autoComplete="off">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Toy Shop / Store Name *</label>
                <div className="relative">
                  <Store className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    required
                    type="text"
                    placeholder="e.g. Galaxy Wonderland Toys"
                    value={regForm.shopName}
                    onChange={(e) => setRegForm({ ...regForm, shopName: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#D90429]/30 focus:border-[#D90429]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Owner / Contact Person *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      required
                      type="text"
                      placeholder="e.g. Rajesh Sharma"
                      value={regForm.name}
                      onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#D90429]/30 focus:border-[#D90429]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Business Email *</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      required
                      type="email"
                      placeholder="contact@galaxytoys.in"
                      value={regForm.email}
                      onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#D90429]/30 focus:border-[#D90429]"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Mobile / WhatsApp Phone *</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      required
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={regForm.phone}
                      onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#D90429]/30 focus:border-[#D90429]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">City / Region *</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      required
                      type="text"
                      placeholder="Mumbai, Maharashtra"
                      value={regForm.city}
                      onChange={(e) => setRegForm({ ...regForm, city: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#D90429]/30 focus:border-[#D90429]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Password *</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    required
                    type={showRegPassword ? "text" : "password"}
                    name="vendor_reg_password"
                    id="vendor_reg_password"
                    autoComplete="new-password"
                    placeholder="Create a password"
                    value={regForm.password}
                    onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                    className="w-full pl-9 pr-10 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#D90429]/30 focus:border-[#D90429]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors cursor-pointer p-0.5"
                    tabIndex={-1}
                    title={showRegPassword ? "Hide password" : "Show password"}
                  >
                    {showRegPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Toys You Specialize In</label>
                <input
                  type="text"
                  placeholder="e.g. Remote control cars, STEM robotics, wooden puzzles"
                  value={regForm.description}
                  onChange={(e) => setRegForm({ ...regForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#D90429]/30 focus:border-[#D90429]"
                />
              </div>

              <button
                type="submit"
                disabled={loadingReg}
                className="w-full bg-[#D90429] hover:bg-[#B7092B] text-white py-3 rounded-2xl font-black text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 cursor-pointer"
              >
                {loadingReg ? 'Registering Your Shop...' : 'Register Toy Shop & Start Selling 🚀'}
              </button>
            </form>

            <div className="text-center pt-2">
              <span className="text-xs text-slate-500">Already registered? </span>
              <button
                type="button"
                onClick={() => setActiveTab('login')}
                className="text-xs font-black text-[#D90429] hover:underline cursor-pointer"
              >
                Sign In to Your Shop &rarr;
              </button>
            </div>

          </div>
        )}

        {/* Footer Navigation */}
        <div className="mt-8 pt-4 border-t border-slate-200 flex items-center justify-between text-[11px] font-bold text-slate-500">
          <a
            href="https://playpetal.technobuzzsystems.com"
            className="hover:text-slate-900 transition-colors flex items-center gap-1"
          >
            &larr; Back to Toy Store
          </a>
          <Link
            to="/admin/login"
            className="hover:text-[#D90429] transition-colors flex items-center gap-1 text-[11px] font-bold"
          >
            <ShieldCheck size={12} className="text-slate-400" /> Admin Panel &rarr;
          </Link>
        </div>

      </div>
    </div>
  );
};
