import { Minus, Move, Plus } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { formatMatchTime } from '../utils/formatters'

function isKnockoutMatch(match) {
  const stage = String(match.stage || '').toLowerCase()
  const label = String(match.roundLabel || match.round || '').toLowerCase()

  return [
    'round_of_128',
    'round_of_64',
    'round_of_32',
    'round_of_16',
    'last_128',
    'last_64',
    'last_32',
    'last_16',
    'quarter_final',
    'semi_final',
    'final',
    'grand_final',
  ].includes(stage)
    || label.startsWith('last ')
    || label.includes('quarter-final')
    || label.includes('semi-final')
    || label === 'final'
}

function MatchNode({ match, player1Name, player2Name, player1SkillLevel, player2SkillLevel, registerRef }) {
  const isPlayer1Winner = match.winnerPlayerId === match.player1Id
  const isPlayer2Winner = match.winnerPlayerId === match.player2Id
  const statusTone =
    match.status === 'live'
      ? 'bg-red-500/15 text-red-300 border border-red-400/30'
      : match.status === 'finished'
        ? 'bg-emerald-500/10 text-emerald-200 border border-emerald-400/20'
        : 'bg-white/8 text-slate-300 border border-white/10'

  const displayPlayer1Name = player1Name && player1Name !== 'TBD'
    ? player1SkillLevel ? `${player1Name} - ${player1SkillLevel}` : player1Name
    : player1Name
  const displayPlayer2Name = player2Name && player2Name !== 'TBD'
    ? player2SkillLevel ? `${player2Name} - ${player2SkillLevel}` : player2Name
    : player2Name

  return (
    <article
      ref={(node) => registerRef(match.id, node)}
      className="relative w-full rounded-[1rem] border border-[#2B3958] bg-[#16233D] p-3 text-white shadow-[0_25px_50px_-30px_rgba(15,23,42,0.9)]"
    >
      <div className="mb-3 flex items-start justify-between gap-3 text-[10px] text-slate-300">
        <div>
          <p>{formatMatchTime(match.scheduledAt)}</p>
          <p className="mt-1 uppercase tracking-[0.18em] text-slate-400">
            {match.rawTableNo || 'Table TBC'}
          </p>
        </div>
        <div className="rounded-md bg-[#223150] px-2 py-1 font-bold text-slate-300">
          {match.matchNumber ? `T${match.matchNumber}` : 'TBD'}
        </div>
      </div>

      <div className="space-y-2">
        <div className={`rounded-xl px-3 py-2 text-sm font-semibold ${isPlayer1Winner ? 'bg-white/10 text-white' : 'bg-[#1E2C49] text-slate-200'}`}>
          <div className="flex items-center justify-between gap-3">
            <span className="truncate">{displayPlayer1Name}</span>
            <span className={`display-title text-xl ${isPlayer1Winner ? 'text-red-400' : 'text-white'}`}>
              {match.score1}
            </span>
          </div>
        </div>
        <div className={`rounded-xl px-3 py-2 text-sm font-semibold ${isPlayer2Winner ? 'bg-white/10 text-white' : 'bg-[#1E2C49] text-slate-200'}`}>
          <div className="flex items-center justify-between gap-3">
            <span className="truncate">{displayPlayer2Name}</span>
            <span className={`display-title text-xl ${isPlayer2Winner ? 'text-red-400' : 'text-white'}`}>
              {match.score2}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${statusTone}`}>
          {match.status}
        </span>
        <span className="text-[10px] uppercase tracking-[0.18em] text-slate-300">Race to {match.raceTo}</span>
      </div>
    </article>
  )
}

function BracketSection({ title, matches, resolvePlayerName }) {
  const viewportRef = useRef(null)
  const dragStateRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    scrollLeft: 0,
    scrollTop: 0,
  })
  const skillLevelMap = useMemo(() => {
    const map = {}
    matches.forEach(match => {
      if (match.player1Id) {
        map[match.player1Id] = match.player1SkillLevel || match.skillLevel || null
      }
      if (match.player2Id) {
        map[match.player2Id] = match.player2SkillLevel || match.skillLevel || null
      }
    })
    return map
  }, [matches])

  const rounds = useMemo(() => (
    Object.values(
      matches.reduce((acc, match) => {
        const roundKey = `${match.roundNumber || match.round}`
        if (!acc[roundKey]) {
          acc[roundKey] = {
            key: roundKey,
            roundNumber: match.roundNumber || 0,
            label: match.roundLabel || match.round,
            items: [],
          }
        }
        acc[roundKey].items.push(match)
        return acc
      }, {}),
    )
      .sort((left, right) => left.roundNumber - right.roundNumber)
      .map((round, roundIndex) => ({
        ...round,
        items: round.items
          .slice()
          .sort((left, right) => (left.matchNumber || 0) - (right.matchNumber || 0))
          .map((item, itemIndex) => ({ ...item, _roundIndex: roundIndex, _itemIndex: itemIndex })),
      }))
  ), [matches])

  const baseZoom = useMemo(() => {
    if (matches.length >= 96 || rounds.length >= 7) return 0.72
    if (matches.length >= 48 || rounds.length >= 6) return 0.82
    if (matches.length >= 24 || rounds.length >= 5) return 0.9
    return 1
  }, [matches.length, rounds.length])
  const [zoom, setZoom] = useState(baseZoom)

  useEffect(() => {
    setZoom(baseZoom)
  }, [baseZoom])

  const layout = useMemo(() => {
    const largeKnockout = rounds.length >= 7 || matches.length >= 96
    const mediumKnockout = !largeKnockout && (rounds.length >= 6 || matches.length >= 48)
    const columnWidth = largeKnockout ? 214 : mediumKnockout ? 228 : 250
    const columnGap = largeKnockout ? 72 : mediumKnockout ? 88 : 112
    const cardHeight = largeKnockout ? 154 : mediumKnockout ? 160 : 168
    const verticalGap = largeKnockout ? 56 : mediumKnockout ? 66 : 78
    const paddingY = largeKnockout ? 36 : 48
    const incomingByMatchId = matches.reduce((acc, match) => {
      if (match.nextMatchId) {
        if (!acc[match.nextMatchId]) acc[match.nextMatchId] = []
        acc[match.nextMatchId].push(match)
      }
      return acc
    }, {})
    const centerByMatchId = {}

    const positionedRounds = rounds.map((round, roundIndex) => {
      const items = round.items.map((match, itemIndex) => {
        let centerY

        if (roundIndex === 0) {
          centerY = paddingY + (cardHeight / 2) + (itemIndex * (cardHeight + verticalGap))
        } else {
          const incomingCenters = (incomingByMatchId[match.id] || [])
            .map((sourceMatch) => centerByMatchId[sourceMatch.id])
            .filter((value) => Number.isFinite(value))

          if (incomingCenters.length) {
            centerY = incomingCenters.reduce((sum, value) => sum + value, 0) / incomingCenters.length
          } else {
            const slotSpan = 2 ** roundIndex
            centerY =
              paddingY
              + (cardHeight / 2)
              + ((((itemIndex * slotSpan) + ((slotSpan - 1) / 2))) * (cardHeight + verticalGap))
          }
        }

        centerByMatchId[match.id] = centerY
        return { ...match, centerY }
      })

      return { ...round, items }
    })

    const contentWidth = (positionedRounds.length * columnWidth) + (Math.max(0, positionedRounds.length - 1) * columnGap)
    const maxCenter = Math.max(...Object.values(centerByMatchId), paddingY + (cardHeight / 2))
    const contentHeight = maxCenter + (cardHeight / 2) + paddingY
    const paths = matches.reduce((acc, match) => {
      if (!match.nextMatchId) return acc

      const sourceCenterY = centerByMatchId[match.id]
      const targetCenterY = centerByMatchId[match.nextMatchId]
      if (!Number.isFinite(sourceCenterY) || !Number.isFinite(targetCenterY)) return acc

      const sourceRoundIndex = rounds.findIndex((round) => round.items.some((item) => item.id === match.id))
      const targetRoundIndex = rounds.findIndex((round) => round.items.some((item) => item.id === match.nextMatchId))
      if (sourceRoundIndex < 0 || targetRoundIndex < 0) return acc

      const sourceX = (sourceRoundIndex * (columnWidth + columnGap)) + columnWidth
      const targetX = targetRoundIndex * (columnWidth + columnGap)
      const elbowX = sourceX + Math.max(28, (targetX - sourceX) / 2)

      acc.push(`M ${sourceX} ${sourceCenterY} H ${elbowX} V ${targetCenterY} H ${targetX}`)
      return acc
    }, [])

    return {
      cardHeight,
      columnWidth,
      columnGap,
      contentWidth,
      contentHeight,
      paths,
      rounds: positionedRounds,
    }
  }, [matches, rounds])

  function handlePointerDown(event) {
    if (!viewportRef.current) return

    dragStateRef.current = {
      active: true,
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: viewportRef.current.scrollLeft,
      scrollTop: viewportRef.current.scrollTop,
    }
    viewportRef.current.style.cursor = 'grabbing'
  }

  function handlePointerMove(event) {
    if (!dragStateRef.current.active || !viewportRef.current) return

    const deltaX = event.clientX - dragStateRef.current.startX
    const deltaY = event.clientY - dragStateRef.current.startY
    viewportRef.current.scrollLeft = dragStateRef.current.scrollLeft - deltaX
    viewportRef.current.scrollTop = dragStateRef.current.scrollTop - deltaY
  }

  function handlePointerUp() {
    dragStateRef.current.active = false
    if (viewportRef.current) {
      viewportRef.current.style.cursor = 'grab'
    }
  }

  function updateZoom(nextZoom) {
    setZoom(Math.min(1.4, Math.max(0.7, Number(nextZoom.toFixed(2)))))
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h4 className="text-sm font-bold uppercase tracking-[0.22em] text-slate-500">{title}</h4>
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1 shadow-sm sm:flex">
            <Move className="h-4 w-4 text-slate-500" />
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Drag</span>
          </div>
          <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => updateZoom(zoom - 0.1)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100"
              aria-label="Zoom out"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="min-w-[3.5rem] text-center text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => updateZoom(zoom + 0.1)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100"
              aria-label="Zoom in"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="h-px w-16 bg-gradient-to-r from-slate-200 to-transparent" />
        </div>
      </div>

      <div
        ref={viewportRef}
        className="no-scrollbar overflow-auto rounded-[1.75rem] border border-slate-200 bg-white p-3 sm:p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]"
        style={{ cursor: 'grab' }}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
      >
        <div
          className="relative mx-auto"
          style={{
            width: `${layout.contentWidth * zoom}px`,
            height: `${layout.contentHeight * zoom}px`,
          }}
        >
          <div
            className="score-grid-lines relative origin-top-left"
            style={{
              width: `${layout.contentWidth}px`,
              height: `${layout.contentHeight}px`,
              transform: `scale(${zoom})`,
            }}
          >
            <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
              {layout.paths.map((path, index) => (
                <path
                  key={`${title}-path-${index}`}
                  d={path}
                  fill="none"
                  stroke="rgba(239, 68, 68, 0.92)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
            </svg>

            {layout.rounds.map((round, roundIndex) => {
              const columnLeft = roundIndex * (layout.columnWidth + layout.columnGap)

              return (
                <div
                  key={round.key}
                  className="absolute top-0"
                  style={{ left: `${columnLeft}px`, width: `${layout.columnWidth}px`, height: `${layout.contentHeight}px` }}
                >
                  <div className="mb-4 text-xs font-bold uppercase tracking-[0.22em] text-slate-400">
                    {round.label}
                  </div>
                  {round.items.map((match) => (
                    <div
                      key={match.id}
                      className="absolute left-0 w-full"
                      style={{ top: `${match.centerY - (layout.cardHeight / 2)}px` }}
                    >
                      <MatchNode
                        match={match}
                        registerRef={() => {}}
                        player1Name={resolvePlayerName(match.player1Id, match.player1Name)}
                        player2Name={resolvePlayerName(match.player2Id, match.player2Name)}
                        player1SkillLevel={match.player1Id ? skillLevelMap[match.player1Id] : null}
                        player2SkillLevel={match.player2Id ? skillLevelMap[match.player2Id] : null}
                      />
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function StandardBracketSection({ title, matches, resolvePlayerName }) {
  const rounds = matches.reduce((acc, match) => {
    const roundKey = `${match.bracketType}-${match.roundNumber || match.round}`
    if (!acc[roundKey]) acc[roundKey] = []
    acc[roundKey].push(match)
    return acc
  }, {})

  const skillLevelMap = useMemo(() => {
    const map = {}
    matches.forEach(match => {
      if (match.player1Id) {
        map[match.player1Id] = match.player1SkillLevel || match.skillLevel || null
      }
      if (match.player2Id) {
        map[match.player2Id] = match.player2SkillLevel || match.skillLevel || null
      }
    })
    return map
  }, [matches])

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h4 className="text-sm font-bold uppercase tracking-[0.22em] text-slate-500">{title}</h4>
        <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent" />
      </div>

      <div className="overflow-x-auto">
        <div className="flex min-w-max gap-5 pb-2">
          {Object.entries(rounds)
            .sort((left, right) => (left[1][0]?.roundNumber || 0) - (right[1][0]?.roundNumber || 0))
            .map(([roundKey, roundMatches]) => (
              <div key={roundKey} className="w-[260px] space-y-4">
                <div className="rounded-2xl bg-[#0F172A] px-4 py-3 text-sm font-bold uppercase tracking-[0.22em] text-white">
                  {roundMatches[0]?.round || `Round ${roundMatches[0]?.roundNumber || ''}`}
                </div>
                {roundMatches.map((match) => (
                  <MatchNode
                    key={match.id}
                    match={match}
                    registerRef={() => {}}
                    player1Name={resolvePlayerName(match.player1Id, match.player1Name)}
                    player2Name={resolvePlayerName(match.player2Id, match.player2Name)}
                    player1SkillLevel={match.player1Id ? skillLevelMap[match.player1Id] : null}
                    player2SkillLevel={match.player2Id ? skillLevelMap[match.player2Id] : null}
                  />
                ))}
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}

function BracketBoard({ matches, resolvePlayerName }) {
  // Show all matches in one unified bracket (no skill level grouping)
  const brackets = (matches || []).reduce((acc, match) => {
    const bracketType = match.bracketType || 'main'
    if (!acc[bracketType]) acc[bracketType] = []
    acc[bracketType].push(match)
    return acc
  }, {})

  return (
    <div className="space-y-8">
      {Object.entries(brackets).map(([bracketType, bracketMatches]) => {
        const bracketTitle =
          bracketType === 'loser'
            ? 'Loser Bracket'
            : bracketType === 'final'
              ? 'Final Bracket'
              : 'Winner Bracket'
        const knockoutMatches = bracketMatches.filter(isKnockoutMatch)
        const standardMatches = bracketMatches.filter((match) => !isKnockoutMatch(match))

        return (
          <div key={bracketType} className="space-y-8">
            {standardMatches.length ? (
              <StandardBracketSection
                title={knockoutMatches.length ? `${bracketTitle} - Qualifier` : bracketTitle}
                matches={standardMatches}
                resolvePlayerName={resolvePlayerName}
              />
            ) : null}
            {knockoutMatches.length ? (
              <BracketSection
                title={bracketTitle}
                matches={knockoutMatches}
                resolvePlayerName={resolvePlayerName}
              />
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

export default BracketBoard
