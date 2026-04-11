export function formatBracketRound(match = {}) {
  const bracketType = match.bracketType || 'main'
  const roundNumber = match.roundNumber
  const roundLabel = match.roundLabel || ''
  const stage = match.stage || ''

  if (roundLabel) {
    return roundLabel
      .replace(/^(beginner|intermediate|advanced|pro)\s+/i, '')
      .trim()
  }

  if (stage === 'quarter_final') return 'Quarter-final'
  if (stage === 'semi_final') return 'Semi-final'
  if (stage === 'final' || stage === 'grand_final') return 'Final'
  if (stage === 'round_of_16') return 'Last 16'
  if (stage === 'round_of_32') return 'Last 32'

  if (!roundNumber) {
    return bracketType === 'loser' ? 'Loser Round' : 'Round'
  }

  if (bracketType === 'loser') {
    return `Loser Round ${roundNumber}`
  }

  if (bracketType === 'final') {
    return roundNumber > 1 ? `Final Round ${roundNumber}` : 'Final'
  }

  return `Round ${roundNumber}`
}
