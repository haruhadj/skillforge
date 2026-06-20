import { Fraction } from '../types';

export function gcd(a: number, b: number): number {
  a = Math.abs(Math.round(a));
  b = Math.abs(Math.round(b));
  while (b) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a || 1;
}

export function simplify(f: Fraction): Fraction {
  if (f.d === 0) {
    return { n: f.n >= 0 ? 1 : -1, d: 0 };
  }
  const g = gcd(f.n, f.d);
  let n = Math.round(f.n / g);
  let d = Math.round(f.d / g);
  if (d < 0) {
    n = -n;
    d = -d;
  }
  return { n, d };
}

export function fromInt(val: number): Fraction {
  return { n: val, d: 1 };
}

export function toFloat(f: Fraction): number {
  if (f.d === 0) return NaN;
  return f.n / f.d;
}

export function add(f1: Fraction, f2: Fraction): Fraction {
  return simplify({ n: f1.n * f2.d + f2.n * f1.d, d: f1.d * f2.d });
}

export function sub(f1: Fraction, f2: Fraction): Fraction {
  return simplify({ n: f1.n * f2.d - f2.n * f1.d, d: f1.d * f2.d });
}

export function mul(f1: Fraction, f2: Fraction): Fraction {
  return simplify({ n: f1.n * f2.n, d: f1.d * f2.d });
}

export function div(f1: Fraction, f2: Fraction): Fraction | null {
  if (f2.n === 0) return null; // Prevent divide by zero
  return simplify({ n: f1.n * f2.d, d: f1.d * f2.n });
}

export function is24(f: Fraction): boolean {
  if (f.d === 0) return false;
  // Exact checks
  const exactCheck = f.n === 24 * f.d;
  if (exactCheck) return true;
  // Safe floating-point fallback
  const floatVal = f.n / f.d;
  return Math.abs(floatVal - 24) < 0.00001;
}

export function formatFraction(f: Fraction): string {
  if (f.d === 1) return `${f.n}`;
  return `${f.n}/${f.d}`;
}
