import { useEffect, useRef } from 'react';

const TARGET_VOLUME = 0.15;

/**
 * 低频白噪音 — Web Audio API 合成（无外部采样时 fallback）
 * 新疆旷野风声 + 颂钵嗡鸣的近似合成
 */
export function useAmbientNoise(enabled = true) {
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    let cancelled = false;
    const ctx = new AudioContext();
    ctxRef.current = ctx;

    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(ctx.destination);

    const bufferSize = 2 * ctx.sampleRate;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0)!;
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 280;

    const bowl = ctx.createOscillator();
    bowl.type = 'sine';
    bowl.frequency.value = 136.1;

    const bowlGain = ctx.createGain();
    bowlGain.gain.value = 0.08;

    noise.connect(lowpass);
    lowpass.connect(gain);
    bowl.connect(bowlGain);
    bowlGain.connect(gain);

    noise.start();
    bowl.start();

    const fadeIn = ctx.currentTime + 0.5;
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(TARGET_VOLUME, fadeIn);

    const resume = () => {
      if (cancelled) return;
      void ctx.resume();
    };
    document.addEventListener('pointerdown', resume, { once: true });

    return () => {
      cancelled = true;
      document.removeEventListener('pointerdown', resume);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
      setTimeout(() => {
        noise.stop();
        bowl.stop();
        void ctx.close();
      }, 400);
    };
  }, [enabled]);
}
