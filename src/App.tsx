import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User, PeerNode, Transaction } from './types';
import {
  getSavedSession,
  setSavedSession,
  fetchUserByUsername,
  fetchAllUsers,
  fetchUserTransactions30Days,
  supabase,
} from './lib/supabase';
import { WebRTCMeshManager } from './lib/webrtc';
import { generate30DayTransactionPDF } from './lib/pdf';
import { Header } from './components/Header';
import { HomeScreen } from './components/HomeScreen';
import { SendAndNodesScreen } from './components/SendAndNodesScreen';
import { MiningScreen } from './components/MiningScreen';
import { BottomNav, ActiveTab } from './components/BottomNav';
import { AuthModal } from './components/AuthModal';
import { TransactionHistoryModal } from './components/TransactionHistoryModal';
import { Bell, CheckCircle2, Zap } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => getSavedSession());
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [peers, setPeers] = useState<PeerNode[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<{
    id: string;
    title: string;
    desc: string;
  } | null>(null);

  const webrtcManagerRef = useRef<WebRTCMeshManager | null>(null);

  // Show a temporary banner notification
  const showToast = useCallback((title: string, desc: string) => {
    const id = Math.random().toString();
    setToastMessage({ id, title, desc });
    setTimeout(() => {
      setToastMessage((cur) => (cur?.id === id ? null : cur));
    }, 4500);
  }, []);

  // Reload data for current user
  const reloadData = useCallback(async (user: User) => {
    setIsRefreshing(true);
    try {
      const [freshUser, usersList, txList] = await Promise.all([
        fetchUserByUsername(user.username),
        fetchAllUsers(),
        fetchUserTransactions30Days(user.username),
      ]);

      if (freshUser) {
        setCurrentUser(freshUser);
        setSavedSession(freshUser);
      }
      setAllUsers(usersList);
      setTransactions(txList);
    } catch (err) {
      console.error('Error refreshing data:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Handle incoming WebRTC transaction
  const handleTransactionReceived = useCallback(
    (tx: Transaction) => {
      if (!currentUser) return;

      const isIncoming = tx.receiver_username.toLowerCase() === currentUser.username.toLowerCase();
      const isOutgoing = tx.sender_username.toLowerCase() === currentUser.username.toLowerCase();

      if (isIncoming) {
        // User received RTC via WebRTC DataChannel!
        const updatedBalance = currentUser.balance + tx.amount;
        const updatedUser: User = { ...currentUser, balance: updatedBalance };
        setCurrentUser(updatedUser);
        setSavedSession(updatedUser);

        showToast(
          'RTC Transfer Received (WebRTC)',
          `+${tx.amount.toLocaleString()} RTC from ${tx.sender_username}`
        );
      } else if (isOutgoing) {
        const updatedBalance = Math.max(0, currentUser.balance - tx.amount);
        const updatedUser: User = { ...currentUser, balance: updatedBalance };
        setCurrentUser(updatedUser);
        setSavedSession(updatedUser);
      }

      // Add to transactions list if relevant
      if (isIncoming || isOutgoing) {
        setTransactions((prev) => {
          if (prev.some((t) => t.id === tx.id)) return prev;
          return [tx, ...prev];
        });
      }
    },
    [currentUser, showToast]
  );

  // Initialize WebRTC Mesh and Supabase Realtime when user is logged in
  useEffect(() => {
    if (!currentUser) {
      if (webrtcManagerRef.current) {
        webrtcManagerRef.current.destroy();
        webrtcManagerRef.current = null;
      }
      setPeers([]);
      return;
    }

    // Initialize WebRTC mesh manager
    const manager = new WebRTCMeshManager();
    webrtcManagerRef.current = manager;

    manager.init(
      currentUser,
      (updatedPeers) => {
        setPeers(updatedPeers);
      },
      (incomingTx) => {
        handleTransactionReceived(incomingTx);
      }
    );

    // Initial load of users and transactions
    reloadData(currentUser);

    // Supabase Realtime fallback subscription to db changes
    const dbChannel = supabase
      .channel('public_db_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        (payload) => {
          if (payload.new) {
            const newTx = payload.new as any;
            if (
              newTx.receiver_username?.toLowerCase() === currentUser.username.toLowerCase() ||
              newTx.sender_username?.toLowerCase() === currentUser.username.toLowerCase()
            ) {
              reloadData(currentUser);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users' },
        (payload) => {
          if (payload.new) {
            const u = payload.new as any;
            if (u.username?.toLowerCase() === currentUser.username.toLowerCase()) {
              setCurrentUser((prev) => (prev ? { ...prev, balance: Number(u.balance) } : prev));
            }
          }
        }
      )
      .subscribe();

    return () => {
      manager.destroy();
      webrtcManagerRef.current = null;
      supabase.removeChannel(dbChannel);
    };
  }, [currentUser?.username]);

  // Auth Success Callback
  const handleAuthSuccess = (user: User) => {
    setCurrentUser(user);
    setSavedSession(user);
    reloadData(user);
  };

  // Logout handler
  const handleLogout = () => {
    if (webrtcManagerRef.current) {
      webrtcManagerRef.current.destroy();
      webrtcManagerRef.current = null;
    }
    setSavedSession(null);
    setCurrentUser(null);
    setPeers([]);
    setTransactions([]);
  };

  // Transfer success callback
  const handleTransferSuccess = (newBalance: number) => {
    if (currentUser) {
      const updatedUser: User = { ...currentUser, balance: newBalance };
      setCurrentUser(updatedUser);
      setSavedSession(updatedUser);
      reloadData(updatedUser);
    }
  };

  // Trigger PDF Download
  const handleDownloadPdf = () => {
    if (!currentUser) return;
    try {
      generate30DayTransactionPDF(currentUser, transactions);
      showToast('PDF Exported', '30-Day statement downloaded successfully.');
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      showToast('Export Error', 'Could not generate statement PDF.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-rose-600 selection:text-white pb-20">
      {/* Auth Modal if no active session */}
      {!currentUser && <AuthModal onSuccess={handleAuthSuccess} />}

      {/* Main App Layout */}
      {currentUser && (
        <>
          {/* Header with Network indicator & Triple-Dot menu */}
          <Header
            user={currentUser}
            peers={peers}
            onOpenHistory={() => setIsHistoryModalOpen(true)}
            onDownloadPdf={handleDownloadPdf}
            onRefresh={() => reloadData(currentUser)}
            onLogout={handleLogout}
            isRefreshing={isRefreshing}
          />

          {/* Floating In-App Toast Notification */}
          {toastMessage && (
            <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-sm bg-slate-900/95 border border-rose-500/80 rounded-2xl p-3.5 shadow-xl shadow-rose-950/40 backdrop-blur-md flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-200">
              <div className="w-8 h-8 rounded-xl bg-rose-600 flex items-center justify-center text-white shrink-0 shadow-md">
                <Zap className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-white truncate">
                  {toastMessage.title}
                </div>
                <div className="text-[11px] text-rose-200 truncate">
                  {toastMessage.desc}
                </div>
              </div>
            </div>
          )}

          {/* Main Content Screens */}
          <main className="flex-1 w-full max-w-2xl mx-auto py-2">
            {activeTab === 'home' && (
              <HomeScreen
                user={currentUser}
                onNavigateToSend={() => setActiveTab('send-nodes')}
                onOpenHistory={() => setIsHistoryModalOpen(true)}
              />
            )}

            {activeTab === 'send-nodes' && webrtcManagerRef.current && (
              <SendAndNodesScreen
                currentUser={currentUser}
                allUsers={allUsers}
                peers={peers}
                webrtcManager={webrtcManagerRef.current}
                onTransferSuccess={handleTransferSuccess}
              />
            )}

            {activeTab === 'mining' && (
              <MiningScreen
                user={currentUser}
                onBalanceUpdated={(newBal) => {
                  handleTransferSuccess(newBal);
                  showToast('RTC Mined (+1 RTC)', '5-minute mining cycle completed & ledger updated.');
                }}
              />
            )}
          </main>

          {/* Fixed Bottom Navigation */}
          <BottomNav
            activeTab={activeTab}
            onChangeTab={setActiveTab}
            activePeersCount={peers.filter((p) => p.dataChannelState === 'open').length}
          />

          {/* 30-Day Transaction History Modal */}
          {isHistoryModalOpen && (
            <TransactionHistoryModal
              user={currentUser}
              transactions={transactions}
              onClose={() => setIsHistoryModalOpen(false)}
              onDownloadPdf={handleDownloadPdf}
            />
          )}
        </>
      )}
    </div>
  );
}
