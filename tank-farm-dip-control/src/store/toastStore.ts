import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastState {
  toasts: Toast[];
  addToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
}

let audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

function playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume = 0.08) {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Audio not available (offline or blocked)
  }
}

const sounds: Record<ToastType, () => void> = {
  success: () => {
    playTone(523, 0.1, 'sine', 0.06);
    setTimeout(() => playTone(659, 0.12, 'sine', 0.06), 80);
    setTimeout(() => playTone(784, 0.2, 'sine', 0.05), 160);
  },
  error: () => {
    playTone(200, 0.15, 'square', 0.04);
    setTimeout(() => playTone(160, 0.25, 'square', 0.04), 120);
  },
  info: () => {
    playTone(440, 0.15, 'sine', 0.04);
  },
  warning: () => {
    playTone(330, 0.1, 'triangle', 0.05);
    setTimeout(() => playTone(392, 0.12, 'triangle', 0.05), 100);
  },
};

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  addToast: (message: string, type: ToastType = 'info') => {
    const id = crypto.randomUUID();
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
    sounds[type]();
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },

  removeToast: (id: string) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
}));
