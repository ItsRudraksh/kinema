/**
 * Apple WWDC "Designing Fluid Interfaces" momentum projection:
 * Uses exponential scroll deceleration to project where a flick will rest.
 */
export function projectVelocity(
  velocityPerSecond: number,
  decelerationRate = 0.996,
): number {
  return (
    (velocityPerSecond / 1000) * (decelerationRate / (1 - decelerationRate))
  );
}

/**
 * Progressive boundary resistance (rubber-banding) for drags past edge limits.
 */
export function rubberband(
  overshoot: number,
  dimension: number,
  constant = 0.55,
): number {
  if (dimension <= 0) return 0;
  return (
    (overshoot * dimension * constant) /
    (dimension + constant * Math.abs(overshoot))
  );
}

/**
 * Fibonacci Lattice distributes N points uniformly across a unit sphere
 * with zero polar bunching.
 */
export function fibonacciSpherePoint(
  index: number,
  total: number,
  radius: number,
): [number, number, number] {
  const safeTotal = Math.max(total, 1);
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const y = 1 - ((index + 0.5) / safeTotal) * 2;
  const ringRadius = Math.sqrt(Math.max(0, 1 - y * y));
  const theta = goldenAngle * index;

  return [
    Math.cos(theta) * ringRadius * radius,
    y * radius,
    Math.sin(theta) * ringRadius * radius,
  ];
}
