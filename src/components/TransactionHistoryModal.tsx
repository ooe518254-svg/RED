import React, { useState, useMemo } from 'react';
import { User, Transaction } from '../types';
import {
  X,
  Download,
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  Filter,
  FileSpreadsheet,
  CheckCircle2,
  Calendar,
} from 'lucide-react';

interface TransactionHistoryModalProps {
  user: User;
  transactions: Transaction[];
  onClose: () => void;
  onDownloadPdf: () => void;
}

export const TransactionHistoryModal: React.FC<TransactionHistoryModalProps> = ({
  user,
  transactions,
  onClose,
  onDownloadPdf,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'in' | 'out'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const currentUsernameLower = user.username.toLowerCase();

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const isIncoming = tx.receiver_username.toLowerCase() === currentUsernameLower;
      const isOutgoing = tx.sender_username.toLowerCase() === currentUsernameLower;

      if (filterType === 'in' && !isIncoming) return false;
      if (filterType === 'out' && !isOutgoing) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesSender = tx.sender_username.toLowerCase().includes(query);
        const matchesReceiver = tx.receiver_username.toLowerCase().includes(query);
        const matchesNote = (tx.note || '').toLowerCase().includes(query);
        return matchesSender || matchesReceiver || matchesNote;
      }

      return true;
    });
  }, [transactions, currentUsernameLower, filterType, searchQuery]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="w-full max-w-xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-3xl flex flex-col shadow-2xl shadow-rose-950/30 overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-rose-500" />
              <h2 className="text-base font-bold text-white tracking-tight">
                30-Day Transaction Ledger
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Filtered for the last 30 days for account <span className="text-white font-medium">{user.username}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onDownloadPdf}
              id="history-modal-download-pdf-btn"
              className="py-1.5 px-3 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-600 text-white text-xs font-semibold shadow-sm active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-3 sm:p-4 border-b border-slate-800/80 bg-slate-950/40 flex flex-col sm:flex-row gap-2 shrink-0">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by counterparty..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-rose-500"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                filterType === 'all'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({transactions.length})
            </button>
            <button
              onClick={() => setFilterType('in')}
              className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                filterType === 'in'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              In
            </button>
            <button
              onClick={() => setFilterType('out')}
              className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                filterType === 'out'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Out
            </button>
          </div>
        </div>

        {/* Transactions List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2">
          {filteredTransactions.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <FileSpreadsheet className="w-10 h-10 mx-auto text-slate-700 mb-2" />
              <p className="text-sm font-medium text-slate-400">No transactions found</p>
              <p className="text-xs text-slate-600 mt-1">
                Transfers within the last 30 days will appear here.
              </p>
            </div>
          ) : (
            filteredTransactions.map((tx) => {
              const isIncoming = tx.receiver_username.toLowerCase() === currentUsernameLower;
              const counterparty = isIncoming ? tx.sender_username : tx.receiver_username;
              const dateStr = new Date(tx.created_at).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={tx.id}
                  className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 hover:border-slate-700/80 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                        isIncoming
                          ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/60'
                          : 'bg-rose-950/80 text-rose-400 border-rose-800/60'
                      }`}
                    >
                      {isIncoming ? (
                        <ArrowDownLeft className="w-4 h-4" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white">
                          {isIncoming ? `From ${counterparty}` : `To ${counterparty}`}
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-semibold uppercase ${
                            isIncoming
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/40'
                              : 'bg-rose-950 text-rose-300 border border-rose-800/40'
                          }`}
                        >
                          {isIncoming ? 'Received' : 'Sent'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                        <span>{dateStr}</span>
                        {tx.note && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-[120px] text-slate-400 italic">
                              "{tx.note}"
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div
                      className={`text-sm font-bold font-mono ${
                        isIncoming ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isIncoming ? '+' : '-'}
                      {tx.amount.toLocaleString()} RTC
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono flex items-center justify-end gap-1">
                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
                      <span>Confirmed</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span className="font-mono text-[11px]">
            {filteredTransactions.length} Record{filteredTransactions.length !== 1 ? 's' : ''} Listed
          </span>
          <button
            onClick={onDownloadPdf}
            className="flex items-center gap-1.5 text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Statement (PDF)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
