import { createClient } from '@supabase/supabase-js';
import { User, Transaction } from '../types';

export const SUPABASE_URL = 'https://jjfqeddoqtbcjakdfibi.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_cvSbGVjA3KmmWCcpVqhjAw_vQ8oT8ZR';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

const LOCAL_STORAGE_USERS_KEY = 'red_rtc_users_cache_v1';
const LOCAL_STORAGE_TX_KEY = 'red_rtc_transactions_cache_v1';
const LOCAL_STORAGE_SESSION_KEY = 'red_rtc_active_session_v1';

// Seed initial memory cache from localStorage if available
function getLocalUsers(): User[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalUsers(users: User[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_USERS_KEY, JSON.stringify(users));
  } catch (err) {
    console.error('Failed to write users cache', err);
  }
}

function getLocalTransactions(): Transaction[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_TX_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalTransactions(txs: Transaction[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_TX_KEY, JSON.stringify(txs));
  } catch (err) {
    console.error('Failed to write txs cache', err);
  }
}

export function getSavedSession(): User | null {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setSavedSession(user: User | null) {
  try {
    if (user) {
      localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(LOCAL_STORAGE_SESSION_KEY);
    }
  } catch (err) {
    console.error('Failed to save session', err);
  }
}

/**
 * Authentication and Registration logic according to project requirements:
 * - Single simple form: "Username" and "5-Digit Numeric Password"
 * - First-time entry auto-registers the user.
 * - FIRST REGISTERED USER CONSTRAINTS:
 *   - Automatically assigned permanent 'Admin' role
 *   - Granted blue checkmark badge (✓)
 *   - Starting balance: 10,000 RTC
 * - Subsequent users start with 0 RTC.
 */
export async function authenticateOrRegister(
  usernameInput: string,
  passwordInput: string
): Promise<{ user: User; isNewRegistration: boolean }> {
  const username = usernameInput.trim();
  const password = passwordInput.trim();

  // Try to query Supabase first
  let existingUser: User | null = null;
  let userCount = 0;
  let isSupabaseAvailable = false;

  try {
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('*');

    if (!usersError && usersData) {
      isSupabaseAvailable = true;
      userCount = usersData.length;
      const found = usersData.find(
        (u: any) => u.username.toLowerCase() === username.toLowerCase()
      );
      if (found) {
        existingUser = {
          id: String(found.id),
          username: found.username,
          password: found.password,
          role: found.is_admin || found.role === 'Admin' ? 'Admin' : 'User',
          is_admin: Boolean(found.is_admin || found.role === 'Admin'),
          balance: Number(found.balance ?? 0),
          created_at: found.created_at || new Date().toISOString(),
        };
      }
    }
  } catch (err) {
    console.warn('Supabase query failed, falling back to cached state:', err);
  }

  // Fallback to local storage if Supabase failed or table not found
  if (!isSupabaseAvailable) {
    const localUsers = getLocalUsers();
    userCount = localUsers.length;
    const found = localUsers.find(
      (u) => u.username.toLowerCase() === username.toLowerCase()
    );
    if (found) {
      existingUser = found;
    }
  }

  if (existingUser) {
    // Existing user: verify password
    if (existingUser.password && existingUser.password !== password) {
      throw new Error('Invalid 5-digit password for this username.');
    }
    setSavedSession(existingUser);
    return { user: existingUser, isNewRegistration: false };
  }

  // Auto-register as new user
  const isFirstUser = userCount === 0;
  const newUser: User = {
    id: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    username,
    password,
    role: isFirstUser ? 'Admin' : 'User',
    is_admin: isFirstUser,
    balance: isFirstUser ? 10000 : 0,
    created_at: new Date().toISOString(),
  };

  // Persist to Supabase if possible
  if (isSupabaseAvailable) {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert([
          {
            id: newUser.id,
            username: newUser.username,
            password: newUser.password,
            role: newUser.role,
            is_admin: newUser.is_admin,
            balance: newUser.balance,
            created_at: newUser.created_at,
          },
        ])
        .select()
        .single();

      if (!error && data) {
        newUser.id = String(data.id || newUser.id);
      }
    } catch (err) {
      console.warn('Could not insert user directly into Supabase table:', err);
    }
  }

  // Also update local cache
  const localUsers = getLocalUsers();
  const updatedLocal = [...localUsers.filter((u) => u.username !== newUser.username), newUser];
  saveLocalUsers(updatedLocal);
  setSavedSession(newUser);

  return { user: newUser, isNewRegistration: true };
}

/**
 * Fetch fresh user details
 */
export async function fetchUserByUsername(username: string): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .maybeSingle();

    if (!error && data) {
      const u: User = {
        id: String(data.id),
        username: data.username,
        role: data.is_admin || data.role === 'Admin' ? 'Admin' : 'User',
        is_admin: Boolean(data.is_admin || data.role === 'Admin'),
        balance: Number(data.balance ?? 0),
        created_at: data.created_at,
      };
      return u;
    }
  } catch (err) {
    console.warn('Failed to fetch user from Supabase:', err);
  }

  const localUsers = getLocalUsers();
  return localUsers.find((u) => u.username.toLowerCase() === username.toLowerCase()) || null;
}

/**
 * Fetch all registered users
 */
export async function fetchAllUsers(): Promise<User[]> {
  try {
    const { data, error } = await supabase.from('users').select('*');
    if (!error && data && data.length > 0) {
      const users: User[] = data.map((d: any) => ({
        id: String(d.id),
        username: d.username,
        role: d.is_admin || d.role === 'Admin' ? 'Admin' : 'User',
        is_admin: Boolean(d.is_admin || d.role === 'Admin'),
        balance: Number(d.balance ?? 0),
        created_at: d.created_at,
      }));
      saveLocalUsers(users);
      return users;
    }
  } catch (err) {
    console.warn('Could not fetch all users from Supabase:', err);
  }

  return getLocalUsers();
}

/**
 * Execute transfer of RTC between two users
 */
export async function executeTransfer(
  senderUsername: string,
  receiverUsername: string,
  amount: number,
  note?: string
): Promise<{ transaction: Transaction; senderNewBalance: number; receiverNewBalance: number }> {
  if (amount <= 0) {
    throw new Error('Transfer amount must be greater than 0 RTC.');
  }

  if (senderUsername.toLowerCase() === receiverUsername.toLowerCase()) {
    throw new Error('Cannot send RTC to yourself.');
  }

  // Get current sender and receiver
  const sender = await fetchUserByUsername(senderUsername);
  if (!sender) {
    throw new Error(`Sender "${senderUsername}" not found.`);
  }

  if (sender.balance < amount) {
    throw new Error(
      `Insufficient balance. You have ${sender.balance.toLocaleString()} RTC, but requested ${amount.toLocaleString()} RTC.`
    );
  }

  const receiver = await fetchUserByUsername(receiverUsername);
  if (!receiver) {
    throw new Error(`Recipient "${receiverUsername}" was not found.`);
  }

  const senderNewBalance = sender.balance - amount;
  const receiverNewBalance = receiver.balance + amount;

  const txId = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const txHash = '0x' + Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  const now = new Date().toISOString();

  const newTx: Transaction = {
    id: txId,
    sender_username: sender.username,
    receiver_username: receiver.username,
    amount,
    created_at: now,
    note: note || 'Peer transfer',
    tx_hash: txHash,
  };

  // Update in Supabase
  try {
    await supabase
      .from('users')
      .update({ balance: senderNewBalance })
      .eq('username', sender.username);

    await supabase
      .from('users')
      .update({ balance: receiverNewBalance })
      .eq('username', receiver.username);

    await supabase.from('transactions').insert([
      {
        id: newTx.id,
        sender_username: newTx.sender_username,
        receiver_username: newTx.receiver_username,
        amount: newTx.amount,
        created_at: newTx.created_at,
      },
    ]);
  } catch (err) {
    console.warn('Supabase transfer sync warning (saving locally):', err);
  }

  // Update local cache
  const localUsers = getLocalUsers();
  const updatedUsers = localUsers.map((u) => {
    if (u.username.toLowerCase() === sender.username.toLowerCase()) {
      return { ...u, balance: senderNewBalance };
    }
    if (u.username.toLowerCase() === receiver.username.toLowerCase()) {
      return { ...u, balance: receiverNewBalance };
    }
    return u;
  });
  saveLocalUsers(updatedUsers);

  const localTxs = getLocalTransactions();
  saveLocalTransactions([newTx, ...localTxs]);

  // Update session if sender is current
  const session = getSavedSession();
  if (session && session.username.toLowerCase() === sender.username.toLowerCase()) {
    setSavedSession({ ...session, balance: senderNewBalance });
  }

  return { transaction: newTx, senderNewBalance, receiverNewBalance };
}

/**
 * Fetch transactions filtered for the last 30 days for a user
 */
export async function fetchUserTransactions30Days(username: string): Promise<Transaction[]> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  let fetchedTxs: Transaction[] = [];

  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .gte('created_at', thirtyDaysAgo)
      .or(`sender_username.eq.${username},receiver_username.eq.${username}`)
      .order('created_at', { ascending: false });

    if (!error && data) {
      fetchedTxs = data.map((d: any) => ({
        id: String(d.id),
        sender_username: d.sender_username,
        receiver_username: d.receiver_username,
        amount: Number(d.amount),
        created_at: d.created_at,
        tx_hash: d.tx_hash || '0x' + String(d.id).slice(0, 16),
      }));
    }
  } catch (err) {
    console.warn('Could not fetch txs from Supabase:', err);
  }

  // Merge with local cache
  const localTxs = getLocalTransactions().filter((t) => {
    const isUser =
      t.sender_username.toLowerCase() === username.toLowerCase() ||
      t.receiver_username.toLowerCase() === username.toLowerCase();
    const isWithin30Days = new Date(t.created_at).getTime() >= new Date(thirtyDaysAgo).getTime();
    return isUser && isWithin30Days;
  });

  const map = new Map<string, Transaction>();
  for (const t of [...fetchedTxs, ...localTxs]) {
    map.set(t.id, t);
  }

  const combined = Array.from(map.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return combined;
}

/**
 * Claim mining reward (+1 RTC) upon completing 5 minutes (300 seconds) of cumulative gameplay.
 * Persists to Supabase users and transactions tables, updates local cache and session.
 */
export async function claimMiningReward(username: string): Promise<{ newBalance: number; transaction: Transaction }> {
  const user = await fetchUserByUsername(username);
  if (!user) {
    throw new Error(`User "${username}" not found.`);
  }

  const newBalance = user.balance + 1;
  const txId = `tx_mine_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const txHash = '0x' + Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  const now = new Date().toISOString();

  const miningTx: Transaction = {
    id: txId,
    sender_username: 'COINBASE_MINING',
    receiver_username: user.username,
    amount: 1,
    created_at: now,
    note: '5-Minute Proof-of-Play Mining Reward (+1 RTC)',
    tx_hash: txHash,
  };

  // Sync to Supabase
  try {
    await supabase
      .from('users')
      .update({ balance: newBalance })
      .eq('username', user.username);

    await supabase.from('transactions').insert([
      {
        id: miningTx.id,
        sender_username: miningTx.sender_username,
        receiver_username: miningTx.receiver_username,
        amount: miningTx.amount,
        created_at: miningTx.created_at,
      },
    ]);
  } catch (err) {
    console.warn('Supabase mining reward sync warning (saving locally):', err);
  }

  // Update local cache
  const localUsers = getLocalUsers();
  const updatedUsers = localUsers.map((u) => {
    if (u.username.toLowerCase() === user.username.toLowerCase()) {
      return { ...u, balance: newBalance };
    }
    return u;
  });
  saveLocalUsers(updatedUsers);

  const localTxs = getLocalTransactions();
  saveLocalTransactions([miningTx, ...localTxs]);

  const session = getSavedSession();
  if (session && session.username.toLowerCase() === user.username.toLowerCase()) {
    setSavedSession({ ...session, balance: newBalance });
  }

  return { newBalance, transaction: miningTx };
}
