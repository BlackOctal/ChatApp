// Module-level singleton — NOT React state.
// Shared RTCPeerConnection and signal-send function so any component or hook
// can send WebRTC signals or read the current peer connection without prop-drilling.

let _pc: RTCPeerConnection | null = null;
let _sendFn: ((payload: object) => void) | null = null;

export const sharedWebRTC = {
  getPc:      (): RTCPeerConnection | null => _pc,
  setPc:      (pc: RTCPeerConnection | null): void => { _pc = pc; },
  setSendFn:  (fn: ((payload: object) => void) | null): void => { _sendFn = fn; },
  sendSignal: (payload: object): void => { _sendFn?.(payload); },
};
