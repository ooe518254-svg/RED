import React, { useState, useMemo } from 'react';
import { User, PeerNode } from '../types';
import { executeTransfer } from '../lib/supabase';
import { WebRTCMeshManager } from '../lib/webrtc';
import {
  Send,
  Users,
  Radio,
  CheckCircle2,
  AlertCircle,
  Search,
  Sparkles,
  Zap,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

interface SendAndNodesScreenProps {
  currentUser: User;
  allUsers: User[];
  peers: PeerNode[];
  webrtcManager: WebRTCMeshManager;
  onTransferSuccess: (newBalance: number) => void;
}

export const SendAndNodesScreen: React.FC<SendAndNodesScreenProps> = ({
  currentUser,
  allUsers,
  peers,
  webrtcManager,
  onTransferSuccess,
}) => {
  const [recipient, setRecipient] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Filter possible recipients (excluding current user)
  const candidateUsers = useMemo(() => {
    return allUsers.filter(
      (u) => u.username.toLowerCase() !== currentUser.username.toLowerCase()
    );
  }, [allUsers, currentUser.username]);

  // Online active peers
  const activePeers = useMemo(() => {
    return peers.filter((p) => p.dataChannelState === 'open');
  }, [peers]);

  const parsedAmount = parseFloat(amountStr) || 0;
  const isSufficientBalance = currentUser.balance >= parsedAmount && parsedAmount > 0;

  const handleSelectRecipient = (name: string) => {
    setRecipient(name);
    setStatusMessage(null);
  };

  const handlePresetAmount = (val: number) => {
    setAmountStr(String(val));
  };

  const handleMaxAmount = () => {
    setAmountStr(String(currentUser.balance));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    const targetUser = recipient.trim();
    if (!targetUser) {
      setStatusMessage({ type: 'error', text: 'Please choose or type a recipient username.' });
      return;
    }

    if (targetUser.toLowerCase() === currentUser.username.toLowerCase()) {
      setStatusMessage({ type: 'error', text: 'You cannot send RTC to yourself.' });
      return;
    }

    if (parsedAmount <= 0) {
      setStatusMessage({ type: 'error', text: 'Please enter a valid amount greater than 0 RTC.' });
      return;
    }

    if (parsedAmount > currentUser.balance) {
      setStatusMessage({
        type: 'error',
        text: `Insufficient balance! You have ${currentUser.balance.toLocaleString()} RTC available.`,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Update in Supabase & local persistent ledger
      const result = await executeTransfer(
        currentUser.username,
        targetUser,
        parsedAmount,
        note.trim()
      );

      // 2. Broadcast immediately across active WebRTC DataChannels
      const broadcastCount = webrtcManager.broadcastTransaction(result.transaction);

      onTransferSuccess(result.senderNewBalance);
      setStatusMessage({
        type: 'success',
        text: `Successfully transferred ${parsedAmount.toLocaleString()} RTC to ${targetUser}! Broadcasted to ${broadcastCount} WebRTC peer(s) and persisted.`,
      });

      // Clear input
      setAmountStr('');
      setNote('');
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Transfer failed. Please check network connectivity.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-5 space-y-6 pb-24">
      {/* SECTION 1: AVAILABLE WEBRTC NODES VIEW */}
      <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-4 sm:p-5 shadow-lg shadow-black/20">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-rose-500 animate-pulse" />
            <h2 className="text-sm font-bold text-white tracking-wide uppercase">
              Available WebRTC Nodes
            </h2>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
            {activePeers.length} Active Peer{activePeers.length !== 1 ? 's' : ''}
          </span>
        </div>

        {activePeers.length === 0 ? (
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 text-center space-y-2">
            <Users className="w-7 h-7 text-slate-400 mx-auto" />
            <p className="text-xs text-slate-300 font-medium">
              Your WebRTC node is active & listening.
            </p>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
              Open Red RTC in another browser window, tab, or mobile device to establish direct WebRTC DataChannel connections.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {activePeers.map((peer) => (
              <div
                key={peer.nodeId}
                className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-slate-800 to-slate-700 flex items-center justify-center font-bold text-white text-xs">
                      {peer.username.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-slate-950" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white">
                        {peer.username}
                      </span>
                      {peer.is_admin && (
                        <span
                          title="Verified Admin (✓)"
                          className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-blue-500 text-white text-[9px] font-black"
                        >
                          ✓
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                      <span>DataChannel Open</span>
                      <span>•</span>
                      <span className="text-emerald-400">{peer.latencyMs ?? 15}ms latency</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleSelectRecipient(peer.username)}
                  className="py-1.5 px-3 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-800/60 text-rose-300 hover:text-white text-xs font-semibold active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                >
                  <span>Select</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 2: SEND MONEY FEATURE */}
      <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-4 sm:p-5 shadow-lg shadow-black/20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4 text-rose-500" />
            <h2 className="text-sm font-bold text-white tracking-wide uppercase">
              Send RTC Transfer
            </h2>
          </div>
          <div className="text-xs font-mono text-slate-400">
            Avail: <span className="text-white font-bold">{currentUser.balance.toLocaleString()}</span> RTC
          </div>
        </div>

        {statusMessage && (
          <div
            className={`mb-4 p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/70 border-emerald-800 text-emerald-200'
                : 'bg-rose-950/70 border-rose-800 text-rose-200'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div className="leading-relaxed">{statusMessage.text}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Recipient Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Recipient Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                id="send-recipient-input"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="Enter username or pick from registered nodes below"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors placeholder:text-slate-600"
              />
            </div>

            {/* Registered users shortcut chips */}
            {candidateUsers.length > 0 && (
              <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">
                  Known Nodes:
                </span>
                {candidateUsers.slice(0, 6).map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleSelectRecipient(u.username)}
                    className={`text-[11px] px-2 py-0.5 rounded-md border transition-colors flex items-center gap-1 cursor-pointer ${
                      recipient.toLowerCase() === u.username.toLowerCase()
                        ? 'bg-rose-600 border-rose-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <span>{u.username}</span>
                    {u.is_admin && <span className="text-[9px] text-blue-400 font-bold">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Amount input */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Amount (RTC)
              </label>
              <button
                type="button"
                onClick={handleMaxAmount}
                className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
              >
                Max ({currentUser.balance.toLocaleString()})
              </button>
            </div>
            <div className="relative">
              <input
                type="number"
                id="send-amount-input"
                min="1"
                step="any"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="0.00"
                required
                className="w-full pl-4 pr-16 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-lg font-bold focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors placeholder:text-slate-700"
              />
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-rose-500 font-mono font-bold text-sm">
                RTC
              </div>
            </div>

            {/* Quick preset chips */}
            <div className="grid grid-cols-4 gap-2 mt-2">
              {[10, 50, 100, 500].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handlePresetAmount(preset)}
                  disabled={currentUser.balance < preset}
                  className="py-1 px-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 disabled:opacity-30 disabled:pointer-events-none text-slate-300 text-xs font-mono font-medium active:scale-95 transition-all cursor-pointer text-center"
                >
                  +{preset}
                </button>
              ))}
            </div>
          </div>

          {/* Transfer Note (optional) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Transfer Note (Optional)
            </label>
            <input
              type="text"
              id="send-note-input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Peer payment or node settlement"
              maxLength={60}
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors placeholder:text-slate-600"
            />
          </div>

          {/* Remaining balance preview */}
          {parsedAmount > 0 && (
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 text-[11px] flex items-center justify-between text-slate-300 font-mono">
              <span>Remaining Balance:</span>
              <span className={isSufficientBalance ? 'text-white font-bold' : 'text-rose-400 font-bold'}>
                {Math.max(0, currentUser.balance - parsedAmount).toLocaleString()} RTC
              </span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            id="send-submit-button"
            disabled={isSubmitting || !recipient.trim() || parsedAmount <= 0 || !isSufficientBalance}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl shadow-lg shadow-rose-600/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Broadcasting to WebRTC Mesh & Supabase...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                <span>Send {parsedAmount > 0 ? `${parsedAmount.toLocaleString()} RTC` : 'RTC'}</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
