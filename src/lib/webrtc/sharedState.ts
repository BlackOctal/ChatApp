// Module-level singleton — NOT React state.
// Shared RTCPeerConnection and signal-send function so any component or hook
// can send WebRTC signals or read the current peer connection without prop-drilling.

let _pc: RTCPeerConnection | null = null;
let _sendFn: ((payload: object) => void) | null = null;
// ICE candidates that arrived before remote description was set
let _pendingCandidates: RTCIceCandidateInit[] = [];

export const sharedWebRTC = {
  getPc:      (): RTCPeerConnection | null => _pc,
  setPc:      (pc: RTCPeerConnection | null): void => { _pc = pc; },
  setSendFn:  (fn: ((payload: object) => void) | null): void => { _sendFn = fn; },
  sendSignal: (payload: object): void => { _sendFn?.(payload); },

  queueCandidate: (c: RTCIceCandidateInit): void => { _pendingCandidates.push(c); },

  // Call after setRemoteDescription to add any candidates that arrived early
  flushCandidates: async (pc: RTCPeerConnection): Promise<void> => {
    const queued = _pendingCandidates.splice(0);
    for (const c of queued) {
      try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch {}
    }
  },

  clearCandidates: (): void => { _pendingCandidates = []; },
};
