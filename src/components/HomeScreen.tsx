import React from 'react';
import { User } from '../types';
import { CheckCircle2, Send, FileText, Sparkles } from 'lucide-react';

interface HomeScreenProps {
  user: User;
  onNavigateToSend: () => void;
  onOpenHistory: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  user,
  onNavigateToSend,
  onOpenHistory,
}) => {
  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center px-4 py-6 space-y-7">
      {/* Profile Section */}
      <div className="w-full bg-slate-900/90 border border-slate-800/90 rounded-2xl p-4 flex items-center justify-between shadow-xl shadow-black/20">
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-rose-600 to-rose-400 p-[2px] shadow-md shadow-rose-600/30">
              <div className="w-full h-full bg-slate-950 rounded-full flex items-center justify-center font-bold text-lg text-white">
                {user.username.slice(0, 1).toUpperCase()}
              </div>
            </div>
            {user.is_admin && (
              <div
                title="Verified Admin"
                className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center border-2 border-slate-900 shadow-sm"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold text-white tracking-tight">
                {user.username}
              </span>
              {/* Blue verification checkmark badge (✓) for Admin */}
              {user.is_admin && (
                <span
                  title="Verified Admin"
                  className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-500 text-white text-[11px] font-black leading-none"
                >
                  ✓
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                  user.is_admin
                    ? 'bg-blue-950/80 text-blue-400 border border-blue-800/60'
                    : 'bg-slate-800 text-slate-300 border border-slate-700/60'
                }`}
              >
                {user.is_admin ? 'Admin' : 'User'}
              </span>
            </div>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[11px] font-mono text-slate-400 block">Currency</span>
          <span className="text-xs font-bold text-rose-400 font-mono">RTC</span>
        </div>
      </div>

      {/* Main Highlight: A sleek, circular card/container in the center displaying RTC balance prominently */}
      <div className="relative my-2 flex items-center justify-center">
        {/* Ambient subtle glow ring */}
        <div className="absolute w-72 h-72 rounded-full bg-rose-600/15 blur-3xl pointer-events-none animate-pulse" />

        {/* Circular Card Container */}
        <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-full bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 p-[3px] shadow-2xl shadow-rose-950/40 border border-rose-600/25 flex flex-col items-center justify-center text-center">
          {/* Inner concentric ring */}
          <div className="absolute inset-2 rounded-full border border-slate-800/80 pointer-events-none" />
          <div className="absolute inset-4 rounded-full border border-rose-500/15 pointer-events-none" />

          {/* Currency Symbol Icon */}
          <div className="w-10 h-10 rounded-full bg-rose-950/80 border border-rose-800/60 flex items-center justify-center text-rose-400 mb-2 shadow-inner">
            <span className="font-black text-xs tracking-wider">RTC</span>
          </div>

          <span className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-1">
            Current Balance
          </span>

          {/* Prominent Balance Number */}
          <div className="flex items-baseline justify-center gap-1.5 px-4">
            <span className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight font-mono drop-shadow-sm">
              {user.balance.toLocaleString()}
            </span>
            <span className="text-lg sm:text-xl font-bold text-rose-500 font-mono">
              RTC
            </span>
          </div>

          <div className="mt-3 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-[11px] text-slate-400">
            <Sparkles className="w-3 h-3 text-rose-400" />
            <span>Active Wallet</span>
          </div>
        </div>
      </div>

      {/* Action Buttons: Primary Transfer CTA and 30-Day History */}
      <div className="w-full flex items-center gap-3 pt-2">
        <button
          onClick={onNavigateToSend}
          id="home-send-money-cta"
          className="flex-1 py-3.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-600 text-white font-semibold text-sm shadow-lg shadow-rose-600/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Send className="w-4 h-4" />
          <span>Send RTC</span>
        </button>

        <button
          onClick={onOpenHistory}
          id="home-history-cta"
          className="py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800/80 border border-slate-800 text-slate-200 font-medium text-sm active:scale-[0.98] transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <FileText className="w-4 h-4 text-rose-400" />
          <span>30-Day History</span>
        </button>
      </div>
    </div>
  );
};
