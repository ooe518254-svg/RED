import React from 'react';
import { Home, Send, Pickaxe } from 'lucide-react';

export type ActiveTab = 'home' | 'send-nodes' | 'mining';

interface BottomNavProps {
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
  activePeersCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onChangeTab,
  activePeersCount,
}) => {
  return (
    <nav
      id="bottom-navigation-bar"
      role="navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/90 backdrop-blur-lg border-t border-slate-800/80 px-3 py-2 pb-safe"
    >
      <div className="max-w-md mx-auto grid grid-cols-3 gap-2">
        {/* Tab 1: Home Screen */}
        <button
          type="button"
          id="tab-home-screen"
          onClick={() => onChangeTab('home')}
          className={`flex flex-col items-center justify-center py-2 px-2 rounded-2xl transition-all duration-200 active:scale-95 cursor-pointer select-none ${
            activeTab === 'home'
              ? 'bg-rose-950/60 border border-rose-800/60 text-white shadow-md shadow-rose-950/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
          }`}
        >
          <Home
            className={`w-5 h-5 mb-1 transition-transform ${
              activeTab === 'home' ? 'scale-110 text-rose-500' : 'text-slate-400'
            }`}
          />
          <span className="text-[11px] font-semibold tracking-wide truncate">
            Home
          </span>
        </button>

        {/* Tab 2: Nodes & Send */}
        <button
          type="button"
          id="tab-send-nodes-screen"
          onClick={() => onChangeTab('send-nodes')}
          className={`relative flex flex-col items-center justify-center py-2 px-2 rounded-2xl transition-all duration-200 active:scale-95 cursor-pointer select-none ${
            activeTab === 'send-nodes'
              ? 'bg-rose-950/60 border border-rose-800/60 text-white shadow-md shadow-rose-950/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
          }`}
        >
          <div className="relative">
            <Send
              className={`w-5 h-5 mb-1 transition-transform ${
                activeTab === 'send-nodes' ? 'scale-110 text-rose-500' : 'text-slate-400'
              }`}
            />
            {activePeersCount > 0 && (
              <span className="absolute -top-1 -right-2 px-1.5 py-0.2 bg-emerald-500 text-slate-950 font-mono font-bold text-[9px] rounded-full">
                {activePeersCount}
              </span>
            )}
          </div>
          <span className="text-[11px] font-semibold tracking-wide truncate">
            Nodes & Send
          </span>
        </button>

        {/* Tab 3: Mining (NEW) */}
        <button
          type="button"
          id="tab-mining-screen"
          onClick={() => onChangeTab('mining')}
          className={`relative flex flex-col items-center justify-center py-2 px-2 rounded-2xl transition-all duration-200 active:scale-95 cursor-pointer select-none ${
            activeTab === 'mining'
              ? 'bg-rose-950/60 border border-rose-800/60 text-white shadow-md shadow-rose-950/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
          }`}
        >
          <Pickaxe
            className={`w-5 h-5 mb-1 transition-transform ${
              activeTab === 'mining' ? 'scale-110 text-rose-500 animate-pulse' : 'text-slate-400'
            }`}
          />
          <span className="text-[11px] font-semibold tracking-wide truncate">
            Mining
          </span>
        </button>
      </div>
    </nav>
  );
};
