export type WheelOption = {
  id: string
  label: string
}

export const WHEEL_COLORS = ['#4259f7', '#f5b7a2', '#1e9e6f', '#7c8cfb', '#f2a273', '#5f6473']

const EXTRA_SPINS = 5

export function colorForSegment(index: number): string {
  return WHEEL_COLORS[index % WHEEL_COLORS.length]
}

export function pickWinnerIndex(count: number): number {
  return Math.floor(Math.random() * count)
}

export function buildWheelGradient(options: WheelOption[]): string {
  if (options.length === 0) {
    return 'var(--color-border)'
  }

  const segmentAngle = 360 / options.length
  const stops = options.map(
    (_, index) => `${colorForSegment(index)} ${index * segmentAngle}deg ${(index + 1) * segmentAngle}deg`,
  )

  return `conic-gradient(${stops.join(', ')})`
}

/**
 * Degrees to add to the wheel's current cumulative rotation so segment
 * `winnerIndex` (of `count` equal segments, segment 0 starting at the top
 * and running clockwise) ends up centered under the fixed top pointer.
 */
export function computeSpinDelta(currentRotation: number, winnerIndex: number, count: number): number {
  const segmentAngle = 360 / count
  const currentMod = ((currentRotation % 360) + 360) % 360
  const targetMod = (360 - ((winnerIndex + 0.5) * segmentAngle)) % 360
  const deltaToTarget = ((targetMod - currentMod) % 360 + 360) % 360

  return EXTRA_SPINS * 360 + deltaToTarget
}
