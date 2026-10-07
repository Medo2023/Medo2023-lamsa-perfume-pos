/**
 * Sound Alert Service for Lamsa Perfume POS
 * Synthesizes luxurious, elegant audio chimes using the HTML5 Web Audio API.
 * Works seamlessly across laptops, tablets, and mobile devices without requiring external audio files.
 */

class SoundAlertService {
  private audioCtx: AudioContext | null = null;
  private isSoundEnabled: boolean = true;

  constructor() {
    try {
      const saved = localStorage.getItem('lamsa_owner_sound_alerts_enabled_v1');
      this.isSoundEnabled = saved !== 'false';
    } catch {
      this.isSoundEnabled = true;
    }

    // Auto-unlock audio context on mobile/laptop on first user gesture
    if (typeof window !== 'undefined') {
      const unlockAudio = () => {
        try {
          const ctx = this.getAudioContext();
          if (ctx && ctx.state === 'suspended') {
            ctx.resume().catch(() => {});
          }
        } catch {
          // ignore
        }
        window.removeEventListener('click', unlockAudio);
        window.removeEventListener('touchstart', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
      };
      window.addEventListener('click', unlockAudio, { passive: true });
      window.addEventListener('touchstart', unlockAudio, { passive: true });
      window.addEventListener('keydown', unlockAudio, { passive: true });
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  public isEnabled(): boolean {
    return this.isSoundEnabled;
  }

  public setEnabled(enabled: boolean): void {
    this.isSoundEnabled = enabled;
    try {
      localStorage.setItem('lamsa_owner_sound_alerts_enabled_v1', enabled ? 'true' : 'false');
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Play the signature luxury cash register / crystal glass chime on a new sale.
   * Three progressive harmonious crystal notes (C6 -> G6 -> C7) with warm harmonic decay.
   */
  public playSaleChime(): void {
    if (!this.isSoundEnabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const notes = [1046.5, 1567.98, 2093.0]; // C6, G6, C7 (Sparkling luxury frequencies)

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);

        // Gentle envelope with crystal shimmer
        gain.gain.setValueAtTime(0.001, now + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.28, now + idx * 0.12 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.12 + 0.65);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.7);
      });
    } catch (e) {
      console.warn('Audio chime playback error:', e);
    }
  }

  /**
   * Play an elegant crystal pulse for general store actions (expenses, closures, etc.).
   */
  public playActionChime(): void {
    if (!this.isSoundEnabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, now); // A5 note
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.1);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.22, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.5);
    } catch (e) {
      console.warn('Action chime playback error:', e);
    }
  }

  /**
   * Play a dual-tone gentle warning chime (for low stock or exceptions).
   */
  public playAlertChime(): void {
    if (!this.isSoundEnabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const notes = [587.33, 440.0]; // D5 -> A4 gentle attention

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.16);

        gain.gain.setValueAtTime(0.001, now + idx * 0.16);
        gain.gain.exponentialRampToValueAtTime(0.2, now + idx * 0.16 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.16 + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.16);
        osc.stop(now + idx * 0.16 + 0.45);
      });
    } catch (e) {
      console.warn('Alert chime playback error:', e);
    }
  }
}

export const soundAlertService = new SoundAlertService();
