export const MIN_FREQ = 80.00;
export const MAX_FREQ = 1200.00;

const logMin = Math.log(MIN_FREQ);
const logMax = Math.log(MAX_FREQ);

/**
 * Maps a linear ratio [0, 1] to a logarithmic frequency in standard pitch range.
 */
export function positionToFrequency(ratio: number): number {
  // Constrain ratio is [0, 1]
  const clampedRatio = Math.max(0, Math.min(1, ratio));
  const value = Math.exp(logMin + clampedRatio * (logMax - logMin));
  return Math.round(value * 100) / 100; // Keep 2 decimal places
}

/**
 * Maps a frequency to a linear ratio [0, 1].
 */
export function frequencyToPosition(freq: number): number {
  const clampedFreq = Math.max(MIN_FREQ, Math.min(MAX_FREQ, freq));
  return (Math.log(clampedFreq) - logMin) / (logMax - logMin);
}

/**
 * Calculates absolute musical pitch difference in cents between guess and target.
 * Formula: Cents = 1200 * log_2(f_guess / f_target)
 */
export function calculateCentsDifference(guess: number, target: number): number {
  if (guess <= 0 || target <= 0) return 0;
  return 1200 * Math.log2(guess / target);
}

/**
 * Calculates score from 0.00 to 10.00 based on cents difference.
 * 10.00 is a perfect match (<= 2 cents error).
 * 0.00 is awarded for error >= 160 cents.
 * A smooth exponent curves the middle values to represent premium acoustic challenge.
 */
export function calculateScore(guess: number, target: number): { score: number; cents: number } {
  const cents = calculateCentsDifference(guess, target);
  const absCents = Math.abs(cents);
  
  if (absCents <= 2) {
    return { score: 10.00, cents };
  }
  
  const maxCents = 160; // Slightly over a semitone and a half
  if (absCents >= maxCents) {
    return { score: 0.00, cents };
  }
  
  // Power of 1.6 gives a lovely rewarding curve (gently sloping, then stricter as you get close)
  const ratio = (absCents - 2) / (maxCents - 2);
  const score = 10.00 * Math.pow(1 - ratio, 1.6);
  
  return { 
    score: Math.round(score * 100) / 100, // round to 2 decimals
    cents: Math.round(cents * 100) / 100
  };
}

/**
 * Generates a random target frequency logarithmically weighted
 * to cover low, mid, and high frequencies realistically.
 */
export function generateRandomFrequency(): number {
  const randomPos = Math.random();
  return positionToFrequency(randomPos);
}

/**
 * Helper to retrieve a witty/snarky message based on score.
 */
export function getSnarkyMessage(score: number): string {
  // Let the types file handle this
  const messages = [
    { minScore: 9.96, message: "Perfect pitch! Are you an oscillator in disguise? 🧠🎧" },
    { minScore: 9.7, message: "Incredible ear! Practically indistinguishable. ⭐" },
    { minScore: 9.0, message: "Exquisite. Your ears are finely tuned instruments. 🎻" },
    { minScore: 8.0, message: "Very solid! You dialed it in nicely. 🎯" },
    { minScore: 6.0, message: "Decent guess. Just a little flat or sharp. 🎶" },
    { minScore: 3.0, message: "Close-ish, but wouldn't trust you with backing vocals. 🎤" },
    { minScore: 1.0, message: "Ouch. That was practically in another octave. 🙉" },
    { minScore: 0.001, message: "Did you mute your browser, or are you just vibing? 🔇" },
    { minScore: 0.0, message: "Absolute silence. Or absolute confusion! 😵‍💫" },
  ];
  const found = messages.find((m) => score >= m.minScore);
  return found ? found.message : "Better luck next round!";
}
