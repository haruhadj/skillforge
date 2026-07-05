/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

let audioCtx: AudioContext | null = null;

/**
 * Initializes the AudioContext if not already created.
 */
function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return null;
  
  if (!audioCtx) {
    audioCtx = new AudioContextClass();
  }
  
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch((err) => console.warn('AudioContext failed to resume:', err));
  }
  
  return audioCtx;
}

/**
 * Generates a realistic wooden "clack" sound of a stone hitting a wood board.
 * It blends a high transient contact tick, a medium tri-wave thud, and low resonance.
 */
export function playClackSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // 1. Ultra-fast transient contact "tick"
    const clickOsc = ctx.createOscillator();
    const clickGain = ctx.createGain();
    clickOsc.type = 'sine';
    clickOsc.frequency.setValueAtTime(1400, now);
    clickOsc.frequency.exponentialRampToValueAtTime(400, now + 0.012);
    
    clickGain.gain.setValueAtTime(0.2, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.012);
    
    clickOsc.connect(clickGain);
    clickGain.connect(ctx.destination);

    // 2. Main wooden clack/wood block thud
    const clackOsc = ctx.createOscillator();
    const clackGain = ctx.createGain();
    clackOsc.type = 'triangle';
    clackOsc.frequency.setValueAtTime(320, now);
    clackOsc.frequency.exponentialRampToValueAtTime(160, now + 0.04);

    clackGain.gain.setValueAtTime(0.45, now);
    clackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    clackOsc.connect(clackGain);
    clackGain.connect(ctx.destination);

    // 3. Deeper heavy tabletop wood resonance
    const resonanceOsc = ctx.createOscillator();
    const resonanceGain = ctx.createGain();
    resonanceOsc.type = 'sine';
    resonanceOsc.frequency.setValueAtTime(135, now);
    resonanceOsc.frequency.exponentialRampToValueAtTime(90, now + 0.08);

    resonanceGain.gain.setValueAtTime(0.35, now);
    resonanceGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    resonanceOsc.connect(resonanceGain);
    resonanceGain.connect(ctx.destination);

    // Start all
    clickOsc.start(now);
    clackOsc.start(now);
    resonanceOsc.start(now);

    // Stop all
    clickOsc.stop(now + 0.02);
    clackOsc.stop(now + 0.08);
    resonanceOsc.stop(now + 0.15);
  } catch (err) {
    console.error('Audio synthesizer error:', err);
  }
}

/**
 * Plays a luxurious, ambient Major 7th chord chime when a player wins,
 * creating an elevated reward feeling.
 */
export function playWinSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    // Harmonic notes: C4 (261.63), E4 (329.63), G4 (392.00), B4 (493.88), C5 (523.25)
    const freqs = [261.63, 329.63, 392.00, 493.88, 523.25];
    
    freqs.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + index * 0.08);
      
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.12, now + index * 0.08 + 0.04);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + index * 0.08 + 0.7);
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.start(now + index * 0.08);
      osc.stop(now + index * 0.08 + 0.8);
    });
  } catch (err) {
    console.error('Victory chime synthesizer error:', err);
  }
}

/**
 * Plays a light UI selection tick for menu taps or toggles.
 */
export function playTickSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.01);
    
    gainNode.gain.setValueAtTime(0.08, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.01);
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.015);
  } catch (err) {
    console.error('Tick synthesizer error:', err);
  }
}
