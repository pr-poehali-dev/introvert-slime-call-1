import { useCallback, useEffect, useRef, useState } from 'react';
import func2url from '../../backend/func2url.json';

const API = func2url.signaling;

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export interface Peer {
  id: string;
  name: string;
  isHost: boolean;
  muted: boolean;
}

type Status = 'idle' | 'connecting' | 'in-call' | 'kicked' | 'closed' | 'error';

const newId = () =>
  'u-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

const post = async (payload: Record<string, unknown>) => {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res;
};

export function useCall() {
  const [status, setStatus] = useState<Status>('idle');
  const [code, setCode] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [micOn, setMicOn] = useState(true);

  const userId = useRef(newId());
  const localStream = useRef<MediaStream | null>(null);
  const pcs = useRef<Map<string, RTCPeerConnection>>(new Map());
  const audioEls = useRef<Map<string, HTMLAudioElement>>(new Map());
  const lastSignalId = useRef(0);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const codeRef = useRef('');
  const stopped = useRef(false);

  const cleanup = useCallback(() => {
    stopped.current = true;
    if (pollTimer.current) clearInterval(pollTimer.current);
    pcs.current.forEach((pc) => pc.close());
    pcs.current.clear();
    audioEls.current.forEach((el) => {
      el.srcObject = null;
      el.remove();
    });
    audioEls.current.clear();
    localStream.current?.getTracks().forEach((t) => t.stop());
    localStream.current = null;
  }, []);

  const createPeer = useCallback((remoteId: string, initiator: boolean) => {
    if (pcs.current.has(remoteId)) return pcs.current.get(remoteId)!;
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcs.current.set(remoteId, pc);

    localStream.current?.getTracks().forEach((track) => {
      pc.addTrack(track, localStream.current!);
    });

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        post({
          action: 'signal',
          code: codeRef.current,
          from: userId.current,
          to: remoteId,
          kind: 'ice',
          payload: JSON.stringify(e.candidate),
        });
      }
    };

    pc.ontrack = (e) => {
      let el = audioEls.current.get(remoteId);
      if (!el) {
        el = document.createElement('audio');
        el.autoplay = true;
        audioEls.current.set(remoteId, el);
        document.body.appendChild(el);
      }
      el.srcObject = e.streams[0];
    };

    if (initiator) {
      pc.onnegotiationneeded = async () => {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        post({
          action: 'signal',
          code: codeRef.current,
          from: userId.current,
          to: remoteId,
          kind: 'offer',
          payload: JSON.stringify(offer),
        });
      };
    }
    return pc;
  }, []);

  const handleSignal = useCallback(
    async (sig: { from: string; kind: string; payload: string }) => {
      const data = JSON.parse(sig.payload);
      if (sig.kind === 'offer') {
        const pc = createPeer(sig.from, false);
        await pc.setRemoteDescription(new RTCSessionDescription(data));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        post({
          action: 'signal',
          code: codeRef.current,
          from: userId.current,
          to: sig.from,
          kind: 'answer',
          payload: JSON.stringify(answer),
        });
      } else if (sig.kind === 'answer') {
        const pc = pcs.current.get(sig.from);
        if (pc) await pc.setRemoteDescription(new RTCSessionDescription(data));
      } else if (sig.kind === 'ice') {
        const pc = pcs.current.get(sig.from);
        if (pc) await pc.addIceCandidate(new RTCIceCandidate(data)).catch(() => {});
      }
    },
    [createPeer]
  );

  const startPolling = useCallback(() => {
    const tick = async () => {
      if (stopped.current) return;
      try {
        const res = await post({
          action: 'poll',
          code: codeRef.current,
          userId: userId.current,
          lastSignalId: lastSignalId.current,
        });
        const data = await res.json();
        if (data.kicked) {
          setStatus('kicked');
          cleanup();
          return;
        }
        if (data.closed) {
          setStatus('closed');
          cleanup();
          return;
        }
        const others: Peer[] = (data.participants || []).filter(
          (p: Peer) => p.id !== userId.current
        );
        setPeers(data.participants || []);

        for (const sig of data.signals || []) {
          lastSignalId.current = Math.max(lastSignalId.current, sig.id);
          await handleSignal(sig);
        }

        // initiate connections to peers with greater id (deterministic to avoid glare)
        for (const p of others) {
          if (!pcs.current.has(p.id) && userId.current < p.id) {
            createPeer(p.id, true);
          }
        }
      } catch {
        /* ignore transient errors */
      }
    };
    tick();
    pollTimer.current = setInterval(tick, 1500);
  }, [cleanup, createPeer, handleSignal]);

  const initMedia = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    localStream.current = stream;
    stream.getAudioTracks().forEach((t) => (t.enabled = true));
  }, []);

  const create = useCallback(
    async (name: string) => {
      setStatus('connecting');
      stopped.current = false;
      try {
        await initMedia();
        const res = await post({ action: 'create', userId: userId.current, name });
        const data = await res.json();
        codeRef.current = data.code;
        setCode(data.code);
        setIsHost(true);
        setStatus('in-call');
        startPolling();
      } catch {
        setStatus('error');
      }
    },
    [initMedia, startPolling]
  );

  const join = useCallback(
    async (joinCode: string, name: string) => {
      setStatus('connecting');
      stopped.current = false;
      try {
        await initMedia();
        const res = await post({ action: 'join', code: joinCode, userId: userId.current, name });
        if (!res.ok) {
          setStatus(res.status === 410 ? 'closed' : 'error');
          return false;
        }
        const data = await res.json();
        codeRef.current = data.code;
        setCode(data.code);
        setIsHost(false);
        setStatus('in-call');
        startPolling();
        return true;
      } catch {
        setStatus('error');
        return false;
      }
    },
    [initMedia, startPolling]
  );

  const toggleMic = useCallback(() => {
    const next = !micOn;
    setMicOn(next);
    localStream.current?.getAudioTracks().forEach((t) => (t.enabled = next));
    post({ action: 'mute', userId: userId.current, muted: !next });
  }, [micOn]);

  const kick = useCallback((targetId: string) => {
    post({ action: 'kick', code: codeRef.current, userId: userId.current, targetId });
    const pc = pcs.current.get(targetId);
    if (pc) {
      pc.close();
      pcs.current.delete(targetId);
    }
  }, []);

  const leave = useCallback(() => {
    post({ action: 'leave', code: codeRef.current, userId: userId.current });
    cleanup();
    setStatus('idle');
    setCode('');
    setPeers([]);
    setIsHost(false);
    setMicOn(true);
    lastSignalId.current = 0;
    codeRef.current = '';
    userId.current = newId();
  }, [cleanup]);

  useEffect(() => () => cleanup(), [cleanup]);

  return {
    myId: userId.current,
    status,
    code,
    isHost,
    peers,
    micOn,
    create,
    join,
    toggleMic,
    kick,
    leave,
  };
}
