export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number {
  const clamped = Math.max(inMin, Math.min(inMax, value));
  const t = (clamped - inMin) / (inMax - inMin);
  return outMin + t * (outMax - outMin);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
