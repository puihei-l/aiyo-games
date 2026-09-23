import { IMPOSTER_CATEGORY_HINTS, IMPOSTER_WORD_BANK, IMPOSTER_WORD_CLUES } from '../data/imposterWords'
import { shuffle } from './shuffle'

export type Player = {
  id: string
  name: string
}

export type ImposterSetup = {
  players: Player[]
  imposterCount: number
  category: string
  hintEnabled: boolean
}

export type ImposterSession = {
  players: Player[]
  imposterIds: string[]
  startingPlayerId: string
  secretWord: string
  clue: string
  category: string
  hintEnabled: boolean
}

function pickWord(category: string): string {
  const pool =
    category === 'Random'
      ? Object.values(IMPOSTER_WORD_BANK).flat()
      : IMPOSTER_WORD_BANK[category] ?? Object.values(IMPOSTER_WORD_BANK).flat()
  return shuffle(pool)[0] ?? pool[0]
}

export function getWordClue(word: string, category: string): string {
  const lookup = Object.entries(IMPOSTER_WORD_CLUES).find(
    ([label]) => label.toLowerCase() === word.trim().toLowerCase(),
  )

  if (lookup) {
    return lookup[1]
  }

  return IMPOSTER_CATEGORY_HINTS[category] ?? 'special detail'
}

export function createGameSession({
  players,
  imposterCount,
  category,
  hintEnabled,
}: ImposterSetup): ImposterSession {
  const imposterIds = shuffle(players.map((player) => player.id)).slice(0, imposterCount)
  const secretWord = pickWord(category)
  const clue = getWordClue(secretWord, category)
  const startingPlayerId = players[Math.floor(Math.random() * players.length)].id

  return {
    players,
    imposterIds,
    startingPlayerId,
    secretWord,
    clue,
    category,
    hintEnabled,
  }
}

export function computeVoteResults(
  players: Player[],
  votes: Record<string, string>,
): Array<{ player: string; votes: number }> {
  const totals = new Map<string, number>()

  players.forEach((player) => {
    totals.set(player.name, 0)
  })

  Object.values(votes).forEach((targetId) => {
    const targetPlayer = players.find((player) => player.id === targetId)

    if (!targetPlayer) {
      return
    }

    totals.set(targetPlayer.name, (totals.get(targetPlayer.name) ?? 0) + 1)
  })

  return Array.from(totals.entries()).map(([player, votesCount]) => ({
    player,
    votes: votesCount,
  }))
}
