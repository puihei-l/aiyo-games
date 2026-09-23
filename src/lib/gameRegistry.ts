export type ThemeName = 'light' | 'dark'

export type GameDefinition = {
  id: string
  name: string
  description: string
  icon: string
  minimumPlayers: number
  maximumPlayers: number
  estimatedDuration: number
  supportedModes: string[]
}

export const GAME_REGISTRY: GameDefinition[] = [
  {
    id: 'imposter',
    name: 'Imposter',
    description: 'A quick social deduction word game for one phone and a group.',
    icon: '✦',
    minimumPlayers: 3,
    maximumPlayers: 20,
    estimatedDuration: 10,
    supportedModes: ['Pass the Phone'],
  },
  {
    id: 'charades',
    name: 'Charades',
    description: 'Act it out and swipe through the deck before time runs out.',
    icon: '◐',
    minimumPlayers: 2,
    maximumPlayers: 20,
    estimatedDuration: 5,
    supportedModes: ['Pass the Phone'],
  },
]

export const BRAND_ASSETS = {
  logo: 'A',
  appIcon: '◈',
  play: '▶',
  back: '←',
  settings: '⚙',
  timer: '◔',
  players: '◉',
  vote: '✓',
  share: '↗',
  close: '×',
  check: '✓',
} as const

export const CATEGORY_OPTIONS = [
  'Random',
  'Animals',
  'Food',
  'Sports',
  'Places',
  'Objects',
  'Jobs',
  'Movies',
  'Technology',
] as const


export const TIMER_OPTIONS = [30, 60, 90, 120, 180, null] as const

export const THEME_OPTIONS: ThemeName[] = ['light', 'dark']

export function getImposterChoices(playerCount: number): number[] {
  const maxImposters = Math.min(3, Math.max(1, Math.ceil(playerCount / 4) + 1))

  return [1, 2, 3].filter(
    (count) => count <= maxImposters && playerCount >= count + 2,
  )
}
