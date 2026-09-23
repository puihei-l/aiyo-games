import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import './App.css'
import {
  BRAND_ASSETS,
  CATEGORY_OPTIONS,
  GAME_REGISTRY,
  TIMER_OPTIONS,
  getImposterChoices,
} from './lib/gameRegistry'
import {
  createGameSession,
  type ImposterSession,
  type Player,
} from './lib/imposterEngine'
import {
  CATEGORY_OPTIONS as CHARADES_CATEGORY_OPTIONS,
  createCharadesSession,
  type CharadesSession,
} from './lib/charadesEngine'

type ScreenName =
  | 'home'
  | 'setup'
  | 'roleReveal'
  | 'startingPlayer'
  | 'results'
  | 'charadesSetup'
  | 'charadesCountdown'
  | 'charadesPlay'
  | 'charadesResults'

type SettingsState = {
  sound: boolean
  haptics: boolean
  theme: 'light' | 'dark'
}

type SetupState = {
  imposterCount: number
  category: string
  hintEnabled: boolean
}

type CharadesSetupState = {
  category: string
  timerSeconds: number | null
}

function createDefaultPlayers(): Player[] {
  return [
    { id: crypto.randomUUID(), name: '' },
    { id: crypto.randomUUID(), name: '' },
    { id: crypto.randomUUID(), name: '' },
  ]
}

const defaultSetup: SetupState = {
  imposterCount: 1,
  category: 'Random',
  hintEnabled: true,
}

const defaultCharadesSetup: CharadesSetupState = {
  category: 'Random',
  timerSeconds: 60,
}

const SWIPE_COMMIT_THRESHOLD = 90
const CHARADES_COUNTDOWN_START = 3

const defaultSettings: SettingsState = {
  sound: true,
  haptics: true,
  theme: 'light',
}

function App() {
  const [screen, setScreen] = useState<ScreenName>('home')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settings, setSettings] = useState<SettingsState>(defaultSettings)
  const [players, setPlayers] = useState<Player[]>(createDefaultPlayers)
  const [setup, setSetup] = useState<SetupState>(defaultSetup)
  const [session, setSession] = useState<ImposterSession | null>(null)
  const [revealIndex, setRevealIndex] = useState(0)
  const [wordVisible, setWordVisible] = useState(false)
  const [hasSeenWord, setHasSeenWord] = useState(false)

  const [charadesSetup, setCharadesSetup] = useState<CharadesSetupState>(defaultCharadesSetup)
  const [charadesSession, setCharadesSession] = useState<CharadesSession | null>(null)
  const [charadesIndex, setCharadesIndex] = useState(0)
  const [correctWords, setCorrectWords] = useState<string[]>([])
  const [skippedWords, setSkippedWords] = useState<string[]>([])
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [dragX, setDragX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const dragStartXRef = useRef<number | null>(null)

  const activePlayers = useMemo(
    () => players.filter((player) => player.name.trim().length > 0),
    [players],
  )
  const imposterChoices = useMemo(
    () => getImposterChoices(activePlayers.length),
    [activePlayers.length],
  )
  const selectedImposterCount = imposterChoices.includes(setup.imposterCount)
    ? setup.imposterCount
    : imposterChoices[0] ?? 1
  const canStart = activePlayers.length >= 3 && activePlayers.length <= 20

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme
  }, [settings.theme])

  useEffect(() => {
    if (screen !== 'charadesPlay' || timeLeft === null) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      if (timeLeft <= 1) {
        setTimeLeft(0)
        endCharadesRound()
      } else {
        setTimeLeft(timeLeft - 1)
      }
    }, 1000)

    return () => window.clearTimeout(timeoutId)
  }, [screen, timeLeft])

  useEffect(() => {
    if (screen !== 'charadesCountdown' || countdown === null) {
      return
    }

    const timeoutId = window.setTimeout(
      () => {
        if (countdown <= 0) {
          setCountdown(null)
          setScreen('charadesPlay')
        } else {
          setCountdown(countdown - 1)
        }
      },
      countdown <= 0 ? 500 : 1000,
    )

    return () => window.clearTimeout(timeoutId)
  }, [screen, countdown])

  function updatePlayerName(playerId: string, name: string) {
    setPlayers((current) => {
      const index = current.findIndex((player) => player.id === playerId)

      if (index === -1) {
        return current
      }

      const updated = current.map((player, playerIndex) =>
        playerIndex === index ? { ...player, name } : player,
      )

      const isLastRow = index === updated.length - 1

      if (isLastRow && name.trim().length > 0 && updated.length < 20) {
        updated.push({ id: crypto.randomUUID(), name: '' })
      }

      while (
        updated.length > 3 &&
        updated[updated.length - 1].name.trim().length === 0 &&
        updated[updated.length - 2].name.trim().length === 0
      ) {
        updated.pop()
      }

      return updated
    })
  }

  function removePlayer(playerId: string) {
    setPlayers((current) => {
      if (current.length <= 3) {
        return current
      }

      const index = current.findIndex((player) => player.id === playerId)

      if (index === -1) {
        return current
      }

      const isBlank = current[index].name.trim().length === 0
      const isLastRow = index === current.length - 1

      if (isLastRow && isBlank) {
        return current
      }

      return current.filter((player) => player.id !== playerId)
    })
  }

  function goHome() {
    setPlayers(createDefaultPlayers())
    setSetup(defaultSetup)
    setSession(null)
    setRevealIndex(0)
    setWordVisible(false)
    setHasSeenWord(false)
    setCharadesSetup(defaultCharadesSetup)
    setCharadesSession(null)
    setCharadesIndex(0)
    setCorrectWords([])
    setSkippedWords([])
    setTimeLeft(null)
    setDragX(0)
    setIsDragging(false)
    setCountdown(null)
    setScreen('home')
  }

  function startGame() {
    if (!canStart) {
      return
    }

    const nextSession = createGameSession({
      players: activePlayers,
      imposterCount: selectedImposterCount,
      category: setup.category,
      hintEnabled: setup.hintEnabled,
    })

    setSession(nextSession)
    setRevealIndex(0)
    setWordVisible(false)
    setHasSeenWord(false)
    setScreen('roleReveal')
  }

  function handleRevealToggle() {
    setWordVisible((current) => {
      const next = !current
      if (next) {
        setHasSeenWord(true)
      }
      return next
    })
  }

  function advanceReveal() {
    if (!session) {
      return
    }

    const nextIndex = revealIndex + 1

    if (nextIndex >= session.players.length) {
      setScreen('startingPlayer')
      return
    }

    setRevealIndex(nextIndex)
    setWordVisible(false)
    setHasSeenWord(false)
  }

  function handlePlayAgain() {
    if (activePlayers.length < 3) {
      setScreen('setup')
      return
    }

    const nextSession = createGameSession({
      players: activePlayers,
      imposterCount: selectedImposterCount,
      category: setup.category,
      hintEnabled: setup.hintEnabled,
    })

    setSession(nextSession)
    setRevealIndex(0)
    setWordVisible(false)
    setHasSeenWord(false)
    setScreen('roleReveal')
  }

  function startCharades() {
    const nextSession = createCharadesSession(charadesSetup)

    setCharadesSession(nextSession)
    setCharadesIndex(0)
    setCorrectWords([])
    setSkippedWords([])
    setTimeLeft(charadesSetup.timerSeconds)
    setDragX(0)
    setIsDragging(false)
    setCountdown(CHARADES_COUNTDOWN_START)
    setScreen('charadesCountdown')
  }

  function endCharadesRound() {
    setScreen('charadesResults')
  }

  function commitSwipe(direction: 'correct' | 'skip') {
    if (!charadesSession) {
      return
    }

    const card = charadesSession.deck[charadesIndex]

    if (!card) {
      return
    }

    if (direction === 'correct') {
      setCorrectWords((current) => [...current, card.word])
    } else {
      setSkippedWords((current) => [...current, card.word])
    }

    setDragX(0)
    setIsDragging(false)

    const nextIndex = charadesIndex + 1

    if (nextIndex >= charadesSession.deck.length) {
      endCharadesRound()
      return
    }

    setCharadesIndex(nextIndex)
  }

  function handleCardPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    dragStartXRef.current = event.clientX
    setIsDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function handleCardPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragStartXRef.current === null) {
      return
    }

    setDragX(event.clientX - dragStartXRef.current)
  }

  function handleCardPointerUp() {
    if (dragStartXRef.current === null) {
      return
    }

    dragStartXRef.current = null
    setIsDragging(false)

    if (dragX > SWIPE_COMMIT_THRESHOLD) {
      commitSwipe('correct')
    } else if (dragX < -SWIPE_COMMIT_THRESHOLD) {
      commitSwipe('skip')
    } else {
      setDragX(0)
    }
  }

  const currentRevealPlayer = session ? session.players[revealIndex] : null
  const imposterNames = session
    ? session.players.filter((player) => session.imposterIds.includes(player.id)).map((player) => player.name)
    : []
  const canPass = hasSeenWord
  const isLastPlayer = session !== null && revealIndex === session.players.length - 1

  const isRevealImposter =
    session !== null && currentRevealPlayer !== null && session.imposterIds.includes(currentRevealPlayer.id)

  const currentCharadesCard = charadesSession ? charadesSession.deck[charadesIndex] ?? null : null
  const skipTagOpacity = Math.min(1, Math.max(0, -dragX) / SWIPE_COMMIT_THRESHOLD)
  const correctTagOpacity = Math.min(1, Math.max(0, dragX) / SWIPE_COMMIT_THRESHOLD)

  function goToGame(gameId: string) {
    if (gameId === 'charades') {
      setScreen('charadesSetup')
      return
    }

    setScreen('setup')
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-wrap" aria-label="Aiyo games logo">
          <div className="brand-mark">{BRAND_ASSETS.appIcon}</div>
          <div>
            <h1 className="brand-text">Aiyo</h1>
          </div>
        </div>

        <button
          className="icon-button"
          type="button"
          aria-label="Open settings"
          onClick={() => setSettingsOpen(true)}
        >
          {BRAND_ASSETS.settings}
        </button>
      </header>

      {screen === 'home' && (
        <main className="screen">
          {GAME_REGISTRY.map((game) => (
            <button
              key={game.id}
              type="button"
              className="panel game-tile"
              onClick={() => goToGame(game.id)}
            >
              <div>
                <p className="eyebrow">Local play</p>
                <h2>{game.name}</h2>
              </div>
              <span className="game-tile-icon" aria-hidden="true">
                {BRAND_ASSETS.play}
              </span>
            </button>
          ))}
        </main>
      )}

      {screen === 'setup' && (
        <main className="screen">
          <section className="panel">
            <div className="section-headline">
              <div>
                <p className="eyebrow">Setup</p>
                <h3>Imposter</h3>
              </div>
              <button type="button" className="subtle-button" onClick={goHome}>
                {BRAND_ASSETS.back} Back
              </button>
            </div>

            <div className="setup-grid">
              <div className="setup-block">
                <div className="section-label-row">
                  <h4>Players</h4>
                  <span>{activePlayers.length}/20</span>
                </div>
                <div className="player-list">
                  {players.map((player, index) => {
                    const isBlank = player.name.trim().length === 0
                    const isLastRow = index === players.length - 1
                    const removeDisabled = players.length <= 3 || (isLastRow && isBlank)

                    return (
                      <div key={player.id} className="player-row">
                        <input
                          aria-label={`Player ${index + 1} name`}
                          placeholder={`Player ${index + 1}`}
                          value={player.name}
                          onChange={(event) => updatePlayerName(player.id, event.target.value)}
                        />
                        <button
                          type="button"
                          className="ghost-button"
                          aria-label={`Remove player ${index + 1}`}
                          onClick={() => removePlayer(player.id)}
                          disabled={removeDisabled}
                        >
                          {BRAND_ASSETS.close}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="setup-block">
                <div className="setting-stack">
                  <div>
                    <div className="section-label-row">
                      <h4>Imposters</h4>
                    </div>
                    <div className="pill-row">
                      {imposterChoices.map((count) => (
                        <button
                          key={count}
                          type="button"
                          className={selectedImposterCount === count ? 'pill active' : 'pill'}
                          onClick={() => setSetup((current) => ({ ...current, imposterCount: count }))}
                        >
                          {count}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="section-label-row">
                      <h4>Category</h4>
                    </div>
                    <div className="pill-row wrap">
                      {CATEGORY_OPTIONS.map((category) => (
                        <button
                          key={category}
                          type="button"
                          className={setup.category === category ? 'pill active' : 'pill'}
                          onClick={() => setSetup((current) => ({ ...current, category }))}
                        >
                          {category}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="section-label-row">
                      <h4>Imposter hint</h4>
                    </div>
                    <div className="pill-row">
                      <button
                        type="button"
                        className={setup.hintEnabled ? 'pill active' : 'pill'}
                        onClick={() => setSetup((current) => ({ ...current, hintEnabled: true }))}
                      >
                        On
                      </button>
                      <button
                        type="button"
                        className={!setup.hintEnabled ? 'pill active' : 'pill'}
                        onClick={() => setSetup((current) => ({ ...current, hintEnabled: false }))}
                      >
                        Off
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            </div>

            <button
              type="button"
              className="primary-button full-width setup-submit"
              onClick={startGame}
              disabled={!canStart}
            >
              Start game
            </button>
          </section>
        </main>
      )}

      {screen === 'roleReveal' && session && currentRevealPlayer && (
        <main className="screen center-screen">
          <section className="panel reveal-panel">
            <p className="eyebrow">Pass the phone</p>
            <h3>{currentRevealPlayer.name}</h3>

            <button
              type="button"
              className="reveal-card reveal-toggle"
              onClick={handleRevealToggle}
              aria-label={wordVisible ? 'Hide word' : 'Reveal word'}
            >
              {!wordVisible ? (
                <span className="word-placeholder">Tap to reveal</span>
              ) : isRevealImposter ? (
                <>
                  <span className="status-badge danger">Imposter</span>
                  {session.hintEnabled && <h2>Hint: {session.clue}</h2>}
                </>
              ) : (
                <h2>{session.secretWord}</h2>
              )}
            </button>

            <div className="action-row">
              <button type="button" className="subtle-button" onClick={goHome}>
                Quit
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={advanceReveal}
                disabled={!canPass}
              >
                {isLastPlayer ? 'Next' : 'Pass'}
              </button>
            </div>
          </section>
        </main>
      )}

      {screen === 'startingPlayer' && session && (
        <main className="screen center-screen">
          <section className="panel reveal-panel start-screen">
            <p className="eyebrow">Starting first</p>
            <h3>{session.players.find((player) => player.id === session.startingPlayerId)?.name}</h3>
            <div className="action-row full-width-row">
              <button
                type="button"
                className="primary-button full-width"
                onClick={() => setScreen('results')}
              >
                Finish game
              </button>
            </div>
          </section>
        </main>
      )}

      {screen === 'results' && session && (
        <main className="screen">
          <section className="panel">
            <div className="section-headline compact-header">
              <div>
                <p className="eyebrow">Game over</p>
                <h3>Results</h3>
              </div>
            </div>

            <div className="results-grid">
              <div className="results-card">
                <span>Secret word</span>
                <strong>{session.secretWord}</strong>
              </div>
              <div className="results-card">
                <span>Imposter(s)</span>
                <strong>{imposterNames.join(', ') || 'Unknown'}</strong>
              </div>
            </div>

            <div className="action-stack">
              <button type="button" className="primary-button full-width" onClick={handlePlayAgain}>
                Play again
              </button>
              <button type="button" className="subtle-button full-width" onClick={() => setScreen('setup')}>
                Change settings
              </button>
              <button type="button" className="subtle-button full-width" onClick={goHome}>
                Back to home
              </button>
            </div>
          </section>
        </main>
      )}

      {screen === 'charadesSetup' && (
        <main className="screen">
          <section className="panel">
            <div className="section-headline">
              <div>
                <p className="eyebrow">Setup</p>
                <h3>Charades</h3>
              </div>
              <button type="button" className="subtle-button" onClick={goHome}>
                {BRAND_ASSETS.back} Back
              </button>
            </div>

            <div className="setting-stack">
              <div>
                <div className="section-label-row">
                  <h4>Category</h4>
                </div>
                <div className="pill-row wrap">
                  {CHARADES_CATEGORY_OPTIONS.map((category) => (
                    <button
                      key={category}
                      type="button"
                      className={charadesSetup.category === category ? 'pill active' : 'pill'}
                      onClick={() => setCharadesSetup((current) => ({ ...current, category }))}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="section-label-row">
                  <h4>Timer</h4>
                </div>
                <div className="pill-row wrap">
                  {TIMER_OPTIONS.map((seconds) => (
                    <button
                      key={seconds ?? 'none'}
                      type="button"
                      className={charadesSetup.timerSeconds === seconds ? 'pill active' : 'pill'}
                      onClick={() => setCharadesSetup((current) => ({ ...current, timerSeconds: seconds }))}
                    >
                      {seconds === null ? 'No timer' : `${seconds}s`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="button"
              className="primary-button full-width setup-submit"
              onClick={startCharades}
            >
              Start game
            </button>
          </section>
        </main>
      )}

      {screen === 'charadesCountdown' && countdown !== null && (
        <main className="screen center-screen">
          <section className="panel reveal-panel start-screen">
            <p className="eyebrow">Get ready</p>
            <h2 className="countdown-number">{countdown > 0 ? countdown : 'Go!'}</h2>
            <div className="action-row full-width-row">
              <button type="button" className="subtle-button full-width" onClick={goHome}>
                Cancel
              </button>
            </div>
          </section>
        </main>
      )}

      {screen === 'charadesPlay' && charadesSession && (
        <main className="screen center-screen">
          <section className="panel reveal-panel">
            <div className="charades-stats">
              <span className="status-badge success">Correct {correctWords.length}</span>
              <span className="status-badge danger">Skipped {skippedWords.length}</span>
              {timeLeft !== null && <span className="timer-badge">{timeLeft}s</span>}
            </div>

            {currentCharadesCard ? (
              <div
                className={`charade-card${isDragging ? ' dragging' : ''}`}
                style={{ transform: `translateX(${dragX}px) rotate(${dragX / 18}deg)` }}
                onPointerDown={handleCardPointerDown}
                onPointerMove={handleCardPointerMove}
                onPointerUp={handleCardPointerUp}
                onPointerCancel={handleCardPointerUp}
                role="group"
                aria-label={`Word to act out: ${currentCharadesCard.word}`}
              >
                <span className="charade-swipe-tag charade-swipe-tag-skip" style={{ opacity: skipTagOpacity }}>
                  Skip
                </span>
                <h2>{currentCharadesCard.word}</h2>
                <span className="charade-swipe-tag charade-swipe-tag-correct" style={{ opacity: correctTagOpacity }}>
                  Correct
                </span>
              </div>
            ) : (
              <div className="charade-card">
                <h2>Deck complete</h2>
              </div>
            )}

            <p className="charade-hint">← Swipe to skip · Swipe to mark correct →</p>

            <button type="button" className="subtle-button full-width" onClick={endCharadesRound}>
              End round
            </button>
          </section>
        </main>
      )}

      {screen === 'charadesResults' && charadesSession && (
        <main className="screen">
          <section className="panel">
            <div className="section-headline compact-header">
              <div>
                <p className="eyebrow">Game over</p>
                <h3>Results</h3>
              </div>
            </div>

            <div className="results-grid">
              <div className="results-card">
                <span>Correct</span>
                <strong>{correctWords.length}</strong>
              </div>
              <div className="results-card">
                <span>Skipped</span>
                <strong>{skippedWords.length}</strong>
              </div>
            </div>

            <div className="action-stack">
              <button type="button" className="primary-button full-width" onClick={startCharades}>
                Play again
              </button>
              <button
                type="button"
                className="subtle-button full-width"
                onClick={() => setScreen('charadesSetup')}
              >
                Change settings
              </button>
              <button type="button" className="subtle-button full-width" onClick={goHome}>
                Back to home
              </button>
            </div>
          </section>
        </main>
      )}

      {settingsOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Settings panel">
          <div className="modal-card">
            <div className="section-headline compact-header">
              <div>
                <p className="eyebrow">Settings</p>
                <h3>Preferences</h3>
              </div>
              <button type="button" className="icon-button" onClick={() => setSettingsOpen(false)}>
                {BRAND_ASSETS.close}
              </button>
            </div>

            <div className="setting-row">
              <label htmlFor="sound-toggle">Sound</label>
              <button
                id="sound-toggle"
                type="button"
                className={settings.sound ? 'toggle active' : 'toggle'}
                onClick={() => setSettings((current) => ({ ...current, sound: !current.sound }))}
              >
                {settings.sound ? 'On' : 'Off'}
              </button>
            </div>

            <div className="setting-row">
              <label htmlFor="haptics-toggle">Haptics</label>
              <button
                id="haptics-toggle"
                type="button"
                className={settings.haptics ? 'toggle active' : 'toggle'}
                onClick={() => setSettings((current) => ({ ...current, haptics: !current.haptics }))}
              >
                {settings.haptics ? 'On' : 'Off'}
              </button>
            </div>

            <div className="setting-row">
              <label htmlFor="theme-toggle">Theme</label>
              <button
                id="theme-toggle"
                type="button"
                className={settings.theme === 'dark' ? 'toggle active' : 'toggle'}
                onClick={() =>
                  setSettings((current) => ({
                    ...current,
                    theme: current.theme === 'light' ? 'dark' : 'light',
                  }))
                }
              >
                {settings.theme === 'light' ? 'Light' : 'Dark'}
              </button>
            </div>

            <button type="button" className="primary-button full-width" onClick={() => setSettingsOpen(false)}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
