/**
 * Optional sound synthesis via Web Audio API - no audio files
 * Two short tones: dispatch blip and critical alert
 */

let audioCtx: AudioContext | null = null;
let muted = true;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch {
      return null;
    }
  }
  return audioCtx;
}

export function setMuted(m: boolean) {
  muted = m;
}

export function isMuted() {
  return muted;
}

export function playDispatchTone() {
  if (muted) return;
  const ctx = getCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 880;
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.15);
}

export function playCriticalAlert() {
  if (muted) return;
  const ctx = getCtx();
  if (!ctx) return;
  // Two-tone alert
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = 'sine';
  osc1.frequency.value = 440;
  gain1.gain.setValueAtTime(0, ctx.currentTime);
  gain1.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.02);
  gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  osc1.start();
  osc1.stop(ctx.currentTime + 0.18);

  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.value = 660;
  gain2.gain.setValueAtTime(0, ctx.currentTime + 0.2);
  gain2.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.22);
  gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.start(ctx.currentTime + 0.2);
  osc2.stop(ctx.currentTime + 0.4);
}
