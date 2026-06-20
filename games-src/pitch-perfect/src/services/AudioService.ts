export class AudioServiceClass {
  private ctx: AudioContext | null = null;
  private osc: OscillatorNode | null = null;
  private gain: GainNode | null = null;
  public playingType: 'target' | 'guess' | 'none' = 'none';

  public init() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      this.ctx = new AudioContextClass();
    }
  }

  public resume() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /**
   * Play a clean pitch for a specific duration (or infinitely if durationSecs is not provided).
   */
  public playTone(freq: number, type: 'target' | 'guess', durationSecs?: number, onStop?: () => void) {
    this.init();
    if (!this.ctx) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    // Stop current tone if playing
    this.stopTone();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

    // Dynamic wave shape for target vs guess to make them distinctly identifiable!
    // Let's use clean pure sine wave for both, but target has a slight warmth.
    // Pure sine is perfect for matching games.
    osc.type = 'sine';

    // Soft fade-in to prevent sharp pop clicks
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.25, this.ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    this.osc = osc;
    this.gain = gain;
    this.playingType = type;

    if (durationSecs !== undefined) {
      const stopTime = this.ctx.currentTime + durationSecs;
      // Start fading out slightly before stopping
      const fadeDuration = 0.15;
      gain.gain.setValueAtTime(0.25, stopTime - fadeDuration);
      gain.gain.linearRampToValueAtTime(0, stopTime);
      osc.stop(stopTime + 0.05);

      setTimeout(() => {
        if (this.osc === osc) {
          this.osc = null;
          this.gain = null;
          this.playingType = 'none';
          if (onStop) onStop();
        }
      }, durationSecs * 1000);
    }
  }

  /**
   * Start a continuous dial tone, used during live interactive dragging.
   */
  public startTuning(initialFreq: number) {
    this.init();
    if (!this.ctx) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    if (this.playingType === 'guess' && this.osc && this.gain) {
      // Already running, just adjust frequency
      this.setFrequency(initialFreq);
      return;
    }

    this.stopTone();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(initialFreq, this.ctx.currentTime);

    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.2, this.ctx.currentTime + 0.06);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    this.osc = osc;
    this.gain = gain;
    this.playingType = 'guess';
  }

  /**
   * Dynamically adjust current frequency using smooth exponential decay parameter.
   */
  public setFrequency(freq: number) {
    if (!this.ctx || !this.osc) return;
    // Smooting constant is 0.008s for hyper-responsive drag matching without clicking.
    this.osc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.008);
  }

  /**
   * Stop any active audio and perform a smooth quick fade-out.
   */
  public stopTone() {
    if (!this.ctx) return;

    const osc = this.osc;
    const gain = this.gain;

    if (osc && gain) {
      try {
        const fadeOutSecs = 0.08;
        const currentGain = gain.gain.value;
        gain.gain.setValueAtTime(currentGain, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + fadeOutSecs);
        osc.stop(this.ctx.currentTime + fadeOutSecs + 0.02);
      } catch {
        try {
          osc.stop();
        } catch {}
      }
    }

    this.osc = null;
    this.gain = null;
    this.playingType = 'none';
  }
}

export const AudioService = new AudioServiceClass();
