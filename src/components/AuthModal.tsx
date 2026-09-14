import React, { useState } from 'react';
import { User } from '../types';
import { authenticateOrRegister } from '../lib/supabase';
import { ShieldCheck, Lock, UserCheck, AlertCircle, Sparkles, KeyRound } from 'lucide-react';

interface AuthModalProps {
  onSuccess: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setError('Please enter a username.');
      return;
    }

    if (!/^\d{5}$/.test(password.trim())) {
      setError('Password must be exactly 5 numeric digits (e.g. 12345).');
      return;
    }

    setLoading(true);
    try {
      const result = await authenticateOrRegister(cleanUsername, password.trim());
      if (result.isNewRegistration) {
        if (result.user.is_admin) {
          setInfoMessage(
            '🌟 Genesis Node! You are the first registered user. Assigned permanent Admin role (✓) with 10,000 RTC starting balance.'
          );
        } else {
          setInfoMessage('Account registered successfully! Starting balance: 0 RTC.');
        }
        setTimeout(() => {
          onSuccess(result.user);
        }, 900);
      } else {
        onSuccess(result.user);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = (val: string) => {
    // Only allow up to 5 numeric digits
    const cleaned = val.replace(/\D/g, '').slice(0, 5);
    setPassword(cleaned);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-rose-950/30 relative overflow-hidden">
        {/* Glow ambient background */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-rose-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header Branding */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-600 to-rose-400 p-[2px] mb-3 shadow-lg shadow-rose-600/30">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <span className="text-2xl font-black tracking-wider text-rose-500">RED</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Red RTC
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Sign in or auto-register your account
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 flex items-center gap-2.5 text-xs text-rose-300 animate-fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {infoMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/80 flex items-center gap-2.5 text-xs text-emerald-300 animate-fade-in">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{infoMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <UserCheck className="w-4 h-4" />
              </div>
              <input
                type="text"
                id="auth-username-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. Satoshi or Alice"
                autoCapitalize="none"
                autoComplete="username"
                required
                className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors placeholder:text-slate-600"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                5-Digit Numeric Password
              </label>
              <span className="text-[11px] text-slate-400">{password.length}/5 digits</span>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                type="password"
                id="auth-password-input"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={5}
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                placeholder="5 digits (e.g. 54321)"
                autoComplete="current-password"
                required
                className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm tracking-widest focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors placeholder:text-slate-600 placeholder:tracking-normal font-mono"
              />
            </div>
            {/* Visual digit pills */}
            <div className="flex justify-center gap-2 mt-2">
              {[0, 1, 2, 3, 4].map((idx) => (
                <div
                  key={idx}
                  className={`w-3 h-3 rounded-full transition-all duration-200 ${
                    idx < password.length
                      ? 'bg-rose-500 scale-110 shadow-sm shadow-rose-500'
                      : 'bg-slate-800'
                  }`}
                />
              ))}
            </div>
          </div>

          <button
            type="submit"
            id="auth-submit-button"
            disabled={loading || password.length !== 5 || !username.trim()}
            className="w-full mt-2 py-3.5 px-4 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl shadow-lg shadow-rose-600/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Connecting to RTC Network...</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Login or Auto-Register</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-800 text-center">
          <p className="text-[11px] text-slate-400">
            Sessions persist automatically in local secure storage.
          </p>
        </div>
      </div>
    </div>
  );
};
