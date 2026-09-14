import React, { useState, useRef, useEffect } from 'react';
import { User, PeerNode } from '../types';
import { MoreVertical, FileText, Download, LogOut, Radio, RefreshCw, CheckCircle2, Shield } from 'lucide-react';

interface HeaderProps {
  user: User;
  peers: PeerNode[];
  onOpenHistory: () => void;
  onDownloadPdf: () => void;
  onRefresh: () => void;
  onLogout: () => void;
  isRefreshing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  peers,
  onOpenHistory,
  onDownloadPdf,
  onRefresh,
  onLogout,
  isRefreshing = false,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  const activeConnectedCount = peers.filter((p) => p.dataChannelState === 'open').length;

  return (
    <header className="sticky top-0 z-30 w-full bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80 px-4 py-3 sm:px-6">
      <div className="max-w-2xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 to-rose-500 flex items-center justify-center font-black text-white text-base shadow-md shadow-rose-600/30">
            R
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-base tracking-tight text-white">RED</span>
            <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800/60 font-mono">
              RTC
            </span>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            title="Refresh Ledger"
            disabled={isRefreshing}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-colors active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-rose-400' : ''}`} />
          </button>

          {/* Triple-Dot Action Menu */}
          <div className="relative" ref={menuRef}>
            <button
              id="header-triple-dot-button"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-label="Action Menu"
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-900 border border-slate-800 transition-colors active:scale-95 flex items-center justify-center cursor-pointer"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {menuOpen && (
              <div
                id="header-dropdown-menu"
                className="absolute right-0 mt-2 w-64 rounded-2xl bg-slate-900 border border-slate-800 p-2 shadow-2xl shadow-black/80 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
              >
                {/* User quick info */}
                <div className="px-3 py-2 border-b border-slate-800/80 mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-white truncate max-w-[140px]">
                      {user.username}
                    </span>
                    {user.is_admin && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-blue-400 font-bold bg-blue-950/80 border border-blue-800/60 px-1 rounded">
                        <CheckCircle2 className="w-3 h-3 text-blue-400" />
                        Admin
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                    {user.balance.toLocaleString()} RTC
                  </div>
                </div>

                {/* 1-Month Transaction History Option */}
                <button
                  id="menu-open-history"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenHistory();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-slate-200 hover:text-white hover:bg-slate-800/80 rounded-xl transition-colors text-left cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-rose-400 shrink-0" />
                  <div>
                    <div className="font-medium">1-Month Ledger History</div>
                    <div className="text-[10px] text-slate-400">View transactions from past 30 days</div>
                  </div>
                </button>

                {/* Export PDF Feature Option */}
                <button
                  id="menu-download-pdf"
                  onClick={() => {
                    setMenuOpen(false);
                    onDownloadPdf();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-slate-200 hover:text-white hover:bg-slate-800/80 rounded-xl transition-colors text-left cursor-pointer"
                >
                  <Download className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <div className="font-medium">Download PDF Report</div>
                    <div className="text-[10px] text-slate-400">Generate 30-day verified statement</div>
                  </div>
                </button>

                <div className="my-1 border-t border-slate-800/80" />

                {/* Logout option */}
                <button
                  id="menu-logout"
                  onClick={() => {
                    setMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-rose-400 hover:bg-rose-950/40 rounded-xl transition-colors text-left cursor-pointer"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  <span>Sign Out Session</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
