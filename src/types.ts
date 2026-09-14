export type UserRole = 'Admin' | 'User';

export interface User {
  id: string;
  username: string;
  password?: string;
  role: UserRole;
  is_admin: boolean;
  balance: number;
  created_at: string;
}

export interface Transaction {
  id: string;
  sender_username: string;
  receiver_username: string;
  amount: number;
  created_at: string;
  note?: string;
  tx_hash?: string;
}

export interface PeerNode {
  nodeId: string;
  username: string;
  role: UserRole;
  is_admin: boolean;
  connectedAt: number;
  dataChannelState: 'connecting' | 'open' | 'closing' | 'closed';
  latencyMs?: number;
}

export type WebRTCMessage = 
  | { type: 'peer_announce'; nodeId: string; username: string; role: UserRole; is_admin: boolean }
  | { type: 'ping'; timestamp: number }
  | { type: 'pong'; originalTimestamp: number }
  | { type: 'tx_broadcast'; transaction: Transaction; newBalanceMap?: Record<string, number> }
  | { type: 'ledger_sync_request'; fromNodeId: string }
  | { type: 'ledger_sync_response'; transactions: Transaction[]; balanceMap: Record<string, number> };
