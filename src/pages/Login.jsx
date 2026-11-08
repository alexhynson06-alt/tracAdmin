import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminSupabase, clearAdminSessionCache } from '../services/adminAuth';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [notice, setNotice] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const API_BASE_URL = import.meta.env.VITE_API_URL;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setNotice('');

    try {
      if (!adminSupabase) {
        throw new Error('Admin Supabase Auth is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
      }

      if (authMode === 'request-reset') {
        const { error: resetError } = await adminSupabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/login?flow=recovery`
        });
        if (resetError) throw resetError;
        setNotice('If that account exists, a password recovery link has been sent.');
        return;
      }

      if (authMode === 'set-password') {
        if (newPassword.length < 8) throw new Error('Password must be at least 8 characters.');
        if (newPassword !== confirmPassword) throw new Error('Passwords do not match.');

        const { error: passwordError } = await adminSupabase.auth.updateUser({ password: newPassword });
        if (passwordError) throw passwordError;
        setPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setAuthMode('login');
        setNotice('Password updated. Sign in with your new password.');
        await adminSupabase.auth.signOut();
        clearAdminSessionCache();
        return;
      }

      const { data: sessionData, error: signInError } = await adminSupabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (signInError) throw signInError;

      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Supabase did not return an authenticated session');

      const response = await fetch(`${API_BASE_URL}/admin/me`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await response.json();

      if (!response.ok) {
        await adminSupabase.auth.signOut();
        clearAdminSessionCache();
        throw new Error(data.message || 'Login failed');
      }

      const userData = {
        id: data.id,
        username: data.username || data.email,
        name: data.full_name,
        email: data.email,
        role: data.role,
        department: data.department || 'CCS',
        avatar_url: data.avatar_url || ''
      };

      localStorage.setItem('authToken', token);
      localStorage.setItem('currentUser', JSON.stringify(userData));
      window.dispatchEvent(new Event('auth-changed'));

      if (rememberMe) {
        localStorage.setItem('rememberAdminEmail', email.trim());
      } else {
        localStorage.removeItem('rememberAdminEmail');
      }

      navigate('/admin/dashboard');
      
    } catch (err) {
      await adminSupabase?.auth.signOut();
      clearAdminSessionCache();
      console.error('Login error:', err);
      setError(err.message || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const flow = new URLSearchParams(window.location.search).get('flow');
    if (flow === 'invite' || flow === 'recovery') setAuthMode('set-password');

    const remembered = localStorage.getItem('rememberAdminEmail');
    if (remembered) {
      setEmail(remembered);
      setRememberMe(true);
    }
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#071b12] p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/Tracbg.png')" }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(4,24,15,0.86)_0%,rgba(4,24,15,0.62)_52%,rgba(3,15,10,0.78)_100%)]" aria-hidden="true" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_10%,rgba(2,15,9,0.5)_100%)]" aria-hidden="true" />

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-md items-center justify-center sm:min-h-[calc(100vh-3rem)]">
      <div className="w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="mb-5 inline-flex items-center justify-center rounded-full border-4 border-white/90 bg-white p-2 shadow-2xl shadow-black/35">
            <img 
              src="/TracLogo.png" 
              alt="TRAC logo" 
              className="h-28 w-28 rounded-full object-contain sm:h-32 sm:w-32"
            />
          </div>
          <p className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-[#ffe08a] sm:text-base">
            Administration Portal
          </p>
          <h1 className="text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl">
            <span className="text-white">TRAC </span>
            <span className="text-[#F9A825]">REQUEST</span>
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-base font-semibold leading-relaxed text-white/85 sm:text-lg">Online Request and Tracking with Email Notifications</p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-white/30 bg-white/95 p-6 shadow-2xl shadow-black/30 sm:p-8">
          <h2 className="mb-6 text-center text-xl font-bold text-[#1B5E20]">
            {authMode === 'set-password' ? 'Set your password' : authMode === 'request-reset' ? 'Recover password' : 'Admin Login'}
          </h2>
          
          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          {notice && <p role="status" className="mb-5 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
          
          <form onSubmit={handleSubmit}>
            {/* Email Field */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#2E7D32] focus:border-transparent outline-none transition"
                  placeholder="Enter admin email"
                  required
                  disabled={isLoading}
                />
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>

            {authMode === 'login' && <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#2E7D32] focus:border-transparent outline-none transition pr-12"
                  placeholder="Enter password"
                  required
                  disabled={isLoading}
                />
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="trac-button-outline absolute right-2 top-1/2 flex min-h-9 min-w-9 -translate-y-1/2 items-center justify-center rounded-md text-gray-500"
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>}

            {authMode === 'set-password' && <>
              <label className="mb-5 block text-sm font-medium text-gray-700">New password<input type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#2E7D32]" minLength={8} required /></label>
              <label className="mb-6 block text-sm font-medium text-gray-700">Confirm password<input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#2E7D32]" minLength={8} required /></label>
            </>}

            {/* Remember Me */}
            {authMode === 'login' && <div className="flex items-center mb-6">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-[#1B5E20] border-gray-300 rounded focus:ring-[#2E7D32]"
                />
                <span className="ml-2 text-sm text-gray-700">Remember me</span>
              </label>
            </div>}

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="trac-button flex w-full items-center justify-center rounded-xl px-4 py-3 font-semibold active:scale-[0.98]"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </>
              ) : (
                authMode === 'set-password' ? 'Save password' : authMode === 'request-reset' ? 'Send recovery link' : 'Sign In'
              )}
            </button>
          </form>

            <div className="mt-4 text-center">
              {authMode === 'login' ? <button type="button" className="text-sm font-medium text-[#1B5E20] underline" onClick={() => setAuthMode('request-reset')}>Forgot password?</button> : authMode !== 'set-password' ? <button type="button" className="text-sm font-medium text-[#1B5E20] underline" onClick={() => { setAuthMode('login'); setNotice(''); setError(''); }}>Back to sign in</button> : null}
            </div>

          {/* Footer */}
          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-500">
              © 2026 Tawi-Tawi Regional Agricultural College
            </p>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default Login;