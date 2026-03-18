import { Capacitor } from "@capacitor/core";

function isNativePlatform() {
  if (typeof window === "undefined") return false;
  if (Capacitor.isNativePlatform()) return true;
  if (window.location?.protocol === "capacitor:") return true;
  return /Capacitor/i.test(navigator.userAgent);
}

let audioCtx: AudioContext | null = null;

async function playTone(freq: number, durationMs: number, gainValue: number) {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    if (!audioCtx) audioCtx = new Ctx();
    if (audioCtx.state === "suspended") await audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    const now = audioCtx.currentTime;
    const attack = Math.min(0.01, durationMs / 1000 / 2);
    const release = Math.min(0.05, durationMs / 1000 / 2);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(gainValue, now + attack);
    gain.gain.linearRampToValueAtTime(0, now + durationMs / 1000 - release);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + durationMs / 1000);
  } catch {
    // no-op
  }
}

export async function playCheckSound() {
  await playTone(523, 70, 0.028);
  await new Promise((resolve) => setTimeout(resolve, 30));
  await playTone(659, 70, 0.028);
  await new Promise((resolve) => setTimeout(resolve, 30));
  return playTone(784, 90, 0.03);
}

export async function playMessageSound() {
  await playTone(740, 45, 0.018);
  await new Promise((resolve) => setTimeout(resolve, 35));
  return playTone(620, 55, 0.018);
}

export async function hapticLight() {
  if (!isNativePlatform()) return;
  try {
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    // no-op
  }
}

export async function hapticNotification() {
  if (!isNativePlatform()) return;
  try {
    const { Haptics, NotificationType } = await import("@capacitor/haptics");
    await Haptics.notification({ type: NotificationType.Success });
  } catch {
    // no-op
  }
}

export async function hapticStrong() {
  if (!isNativePlatform()) return;
  try {
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    await Haptics.impact({ style: ImpactStyle.Heavy });
  } catch {
    // no-op
  }
}
