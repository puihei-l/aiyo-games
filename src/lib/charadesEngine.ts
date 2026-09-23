import { CHARADES_WORD_BANK } from '../data/charadesWords'
import { shuffle } from './shuffle'

export type CharadesCard = {
  id: string
  word: string
}

export type CharadesSetup = {
  category: string
  timerSeconds: number | null
}

export type CharadesSession = {
  category: string
  timerSeconds: number | null
  deck: CharadesCard[]
}

export const CATEGORY_OPTIONS = ['Random', ...Object.keys(CHARADES_WORD_BANK)] as const

function wordsForCategory(category: string): string[] {
  return category === 'Random' || !CHARADES_WORD_BANK[category]
    ? Object.values(CHARADES_WORD_BANK).flat()
    : CHARADES_WORD_BANK[category]
}

export function createCharadesSession({ category, timerSeconds }: CharadesSetup): CharadesSession {
  const deck = shuffle(wordsForCategory(category)).map((word) => ({
    id: crypto.randomUUID(),
    word,
  }))

  return {
    category,
    timerSeconds,
    deck,
  }
}
