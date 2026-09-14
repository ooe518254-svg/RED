import { supabase } from './supabase';
import { PeerNode, User, Transaction, WebRTCMessage } from '../types';

export type OnPeerListChangeCallback = (peers: PeerNode[]) => void;
export type OnTransactionReceivedCallback = (tx: Transaction) => void;

interface PeerConnectionWrapper {
  nodeId: string;
  username: string;
  role: 'Admin' | 'User';
  is_admin: boolean;
  pc: RTCPeerConnection;
  dc?: RTCDataChannel;
  connectedAt: number;
  lastPingSentAt?: number;
  latencyMs?: number;
}

export class WebRTCMeshManager {
  private localUser: User | null = null;
  public localNodeId: string;
  private connections: Map<string, PeerConnectionWrapper> = new Map();
  private signalingChannel: any = null;
  private onPeerListChange?: OnPeerListChangeCallback;
  private onTransactionReceived?: OnTransactionReceivedCallback;
  private pingIntervalId?: any;

  constructor() {
    this.localNodeId = `node_${Math.random().toString(36).slice(2, 9)}`;
  }

  public init(
    user: User,
    onPeerListChange: OnPeerListChangeCallback,
    onTransactionReceived: OnTransactionReceivedCallback
  ) {
    this.localUser = user;
    this.onPeerListChange = onPeerListChange;
    this.onTransactionReceived = onTransactionReceived;

    this.setupSignaling();
    this.startHeartbeat();

    window.addEventListener('beforeunload', () => {
      this.destroy();
    });
  }

  private setupSignaling() {
    // Connect to Supabase realtime broadcast channel for WebRTC signaling
    this.signalingChannel = supabase.channel('rtc_mesh_signaling', {
      config: {
        broadcast: { ack: false, self: false },
      },
    });

    this.signalingChannel
      .on('broadcast', { event: 'signal' }, (payload: any) => {
        this.handleSignalMessage(payload.payload);
      })
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          // Announce presence to entire network
          this.broadcastSignal({
            action: 'peer_join',
            fromNodeId: this.localNodeId,
            username: this.localUser?.username,
            role: this.localUser?.role,
            is_admin: this.localUser?.is_admin,
          });
        }
      });
  }

  private broadcastSignal(payload: any) {
    if (this.signalingChannel) {
      this.signalingChannel.send({
        type: 'broadcast',
        event: 'signal',
        payload,
      });
    }
  }

  private async handleSignalMessage(msg: any) {
    if (!msg || msg.fromNodeId === this.localNodeId) return;

    switch (msg.action) {
      case 'peer_join': {
        // Someone joined. The node with lexicographically smaller ID initiates the WebRTC offer
        if (this.localNodeId < msg.fromNodeId) {
          this.initiatePeerConnection(
            msg.fromNodeId,
            msg.username,
            msg.role,
            msg.is_admin,
            true
          );
        }
        break;
      }

      case 'offer': {
        if (msg.targetNodeId !== this.localNodeId) return;
        await this.handleOffer(msg);
        break;
      }

      case 'answer': {
        if (msg.targetNodeId !== this.localNodeId) return;
        await this.handleAnswer(msg);
        break;
      }

      case 'ice_candidate': {
        if (msg.targetNodeId !== this.localNodeId) return;
        await this.handleIceCandidate(msg);
        break;
      }

      case 'peer_leave': {
        this.closePeer(msg.fromNodeId);
        break;
      }
    }
  }

  private getRtcConfig(): RTCConfiguration {
    return {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
      ],
    };
  }

  private async initiatePeerConnection(
    remoteNodeId: string,
    username: string,
    role: 'Admin' | 'User',
    is_admin: boolean,
    isInitiator: boolean
  ) {
    if (this.connections.has(remoteNodeId)) {
      return;
    }

    const pc = new RTCPeerConnection(this.getRtcConfig());

    const wrapper: PeerConnectionWrapper = {
      nodeId: remoteNodeId,
      username: username || 'Peer',
      role: role || 'User',
      is_admin: Boolean(is_admin),
      pc,
      connectedAt: Date.now(),
    };

    this.connections.set(remoteNodeId, wrapper);

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        this.broadcastSignal({
          action: 'ice_candidate',
          fromNodeId: this.localNodeId,
          targetNodeId: remoteNodeId,
          candidate: e.candidate,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.closePeer(remoteNodeId);
      }
    };

    if (isInitiator) {
      // Create Data Channel
      const dc = pc.createDataChannel('rtc-ledger-channel', { ordered: true });
      wrapper.dc = dc;
      this.attachDataChannelEvents(dc, wrapper);

      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        this.broadcastSignal({
          action: 'offer',
          fromNodeId: this.localNodeId,
          targetNodeId: remoteNodeId,
          username: this.localUser?.username,
          role: this.localUser?.role,
          is_admin: this.localUser?.is_admin,
          offer,
        });
      } catch (err) {
        console.error('Failed to create offer for peer', remoteNodeId, err);
      }
    } else {
      pc.ondatachannel = (e) => {
        wrapper.dc = e.channel;
        this.attachDataChannelEvents(e.channel, wrapper);
      };
    }
  }

  private async handleOffer(msg: any) {
    let wrapper = this.connections.get(msg.fromNodeId);
    if (!wrapper) {
      await this.initiatePeerConnection(
        msg.fromNodeId,
        msg.username,
        msg.role,
        msg.is_admin,
        false
      );
      wrapper = this.connections.get(msg.fromNodeId);
    }

    if (!wrapper) return;

    try {
      await wrapper.pc.setRemoteDescription(new RTCSessionDescription(msg.offer));
      const answer = await wrapper.pc.createAnswer();
      await wrapper.pc.setLocalDescription(answer);

      this.broadcastSignal({
        action: 'answer',
        fromNodeId: this.localNodeId,
        targetNodeId: msg.fromNodeId,
        username: this.localUser?.username,
        role: this.localUser?.role,
        is_admin: this.localUser?.is_admin,
        answer,
      });
    } catch (err) {
      console.error('Error handling offer from', msg.fromNodeId, err);
    }
  }

  private async handleAnswer(msg: any) {
    const wrapper = this.connections.get(msg.fromNodeId);
    if (!wrapper) return;

    try {
      await wrapper.pc.setRemoteDescription(new RTCSessionDescription(msg.answer));
    } catch (err) {
      console.error('Error handling answer from', msg.fromNodeId, err);
    }
  }

  private async handleIceCandidate(msg: any) {
    const wrapper = this.connections.get(msg.fromNodeId);
    if (!wrapper) return;

    try {
      await wrapper.pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
    } catch (err) {
      console.error('Error adding ICE candidate from', msg.fromNodeId, err);
    }
  }

  private attachDataChannelEvents(dc: RTCDataChannel, wrapper: PeerConnectionWrapper) {
    dc.onopen = () => {
      this.notifyPeerList();
      // Send announce
      if (this.localUser) {
        this.sendToPeer(wrapper.nodeId, {
          type: 'peer_announce',
          nodeId: this.localNodeId,
          username: this.localUser.username,
          role: this.localUser.role,
          is_admin: this.localUser.is_admin,
        });
      }
      // Send ping immediately
      this.pingPeer(wrapper);
    };

    dc.onclose = () => {
      this.notifyPeerList();
    };

    dc.onerror = (err) => {
      console.warn('DataChannel error for node', wrapper.nodeId, err);
    };

    dc.onmessage = (event) => {
      try {
        const data: WebRTCMessage = JSON.parse(event.data);
        this.handleDataChannelMessage(data, wrapper);
      } catch (err) {
        console.error('Invalid message received on DataChannel', err);
      }
    };
  }

  private handleDataChannelMessage(msg: WebRTCMessage, wrapper: PeerConnectionWrapper) {
    switch (msg.type) {
      case 'peer_announce': {
        wrapper.username = msg.username;
        wrapper.role = msg.role;
        wrapper.is_admin = msg.is_admin;
        this.notifyPeerList();
        break;
      }

      case 'ping': {
        this.sendToPeer(wrapper.nodeId, {
          type: 'pong',
          originalTimestamp: msg.timestamp,
        });
        break;
      }

      case 'pong': {
        const now = Date.now();
        wrapper.latencyMs = Math.max(1, Math.round(now - msg.originalTimestamp));
        this.notifyPeerList();
        break;
      }

      case 'tx_broadcast': {
        if (this.onTransactionReceived && msg.transaction) {
          this.onTransactionReceived(msg.transaction);
        }
        break;
      }
    }
  }

  public sendToPeer(nodeId: string, message: WebRTCMessage) {
    const wrapper = this.connections.get(nodeId);
    if (wrapper?.dc && wrapper.dc.readyState === 'open') {
      try {
        wrapper.dc.send(JSON.stringify(message));
      } catch (err) {
        console.warn('Error sending over DataChannel to', nodeId, err);
      }
    }
  }

  public broadcastTransaction(transaction: Transaction) {
    const msg: WebRTCMessage = {
      type: 'tx_broadcast',
      transaction,
    };

    let sentCount = 0;
    this.connections.forEach((wrapper) => {
      if (wrapper.dc && wrapper.dc.readyState === 'open') {
        try {
          wrapper.dc.send(JSON.stringify(msg));
          sentCount++;
        } catch (err) {
          console.error('Broadcast failed for peer', wrapper.nodeId, err);
        }
      }
    });

    return sentCount;
  }

  private pingPeer(wrapper: PeerConnectionWrapper) {
    if (wrapper.dc && wrapper.dc.readyState === 'open') {
      wrapper.lastPingSentAt = Date.now();
      this.sendToPeer(wrapper.nodeId, {
        type: 'ping',
        timestamp: wrapper.lastPingSentAt,
      });
    }
  }

  private startHeartbeat() {
    this.pingIntervalId = setInterval(() => {
      this.connections.forEach((wrapper) => {
        this.pingPeer(wrapper);
      });
    }, 8000);
  }

  private notifyPeerList() {
    if (!this.onPeerListChange) return;

    const peers: PeerNode[] = [];
    this.connections.forEach((wrapper) => {
      peers.push({
        nodeId: wrapper.nodeId,
        username: wrapper.username,
        role: wrapper.role,
        is_admin: wrapper.is_admin,
        connectedAt: wrapper.connectedAt,
        dataChannelState: (wrapper.dc?.readyState as any) || 'closed',
        latencyMs: wrapper.latencyMs || 18,
      });
    });

    this.onPeerListChange(peers);
  }

  private closePeer(nodeId: string) {
    const wrapper = this.connections.get(nodeId);
    if (wrapper) {
      try {
        wrapper.dc?.close();
        wrapper.pc.close();
      } catch (e) {
        // ignore
      }
      this.connections.delete(nodeId);
      this.notifyPeerList();
    }
  }

  public destroy() {
    if (this.pingIntervalId) {
      clearInterval(this.pingIntervalId);
    }

    if (this.signalingChannel) {
      try {
        this.broadcastSignal({
          action: 'peer_leave',
          fromNodeId: this.localNodeId,
        });
        supabase.removeChannel(this.signalingChannel);
      } catch (e) {
        // ignore
      }
    }

    this.connections.forEach((wrapper) => {
      try {
        wrapper.dc?.close();
        wrapper.pc.close();
      } catch (e) {
        // ignore
      }
    });
    this.connections.clear();
  }
}
