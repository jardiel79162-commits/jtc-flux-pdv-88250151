import { useRef, useCallback } from "react";

/**
 * Generates a casino-style tick sound using Web Audio API.
 * No external files needed.
 */
export function useWheelSound() {
  const ctxRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const getCtx = () => {
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return ctxRef.current;
  };

  const playTick = useCallback((pitch = 1200, volume = 0.15) => {
    try {
      const ctx = getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = pitch;
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.06);
    } catch {
      // Silently fail if audio isn't available
    }
  }, []);

  const playWin = useCallback(() => {
    try {
      const ctx = getCtx();
      const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        const startTime = ctx.currentTime + i * 0.12;
        gain.gain.setValueAtTime(0.2, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.3);
      });
    } catch {
      // Silently fail
    }
  }, []);

  /**
   * Start ticking — fast at first, gradually slowing down over `duration` ms.
   */
  const startSpinSound = useCallback((duration = 5500) => {
    stopSpinSound();
    const startTime = Date.now();
    let lastTick = 0;

    const tick = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed > duration) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
        return;
      }
      // Interval goes from 40ms to 250ms over duration
      const progress = elapsed / duration;
      const interval = 40 + progress * progress * 210;
      if (elapsed - lastTick >= interval) {
        lastTick = elapsed;
        // Pitch decreases as it slows
        const pitch = 1400 - progress * 400;
        const vol = 0.12 + (1 - progress) * 0.08;
        playTick(pitch, vol);
      }
    };

    intervalRef.current = setInterval(tick, 20);
  }, [playTick]);

  const stopSpinSound = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  return { startSpinSound, stopSpinSound, playWin, playTick };
}
