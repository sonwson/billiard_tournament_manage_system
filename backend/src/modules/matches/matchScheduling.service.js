const matchRepository = require('./match.repository');

function buildTournamentTableLabels(tournament) {
  const totalTables = Math.max(0, Number(tournament?.tableCount || 0));
  const tvTables = Math.min(totalTables, Math.max(0, Number(tournament?.tvTableCount || 0)));
  const labels = [];

  for (let index = 1; index <= tvTables; index += 1) {
    labels.push(`TV${index}`);
  }

  for (let index = tvTables + 1; index <= totalTables; index += 1) {
    labels.push(`T${index}`);
  }

  return labels;
}

async function assignReadyMatchesToTables(tournament, options = {}) {
  const tableLabels = buildTournamentTableLabels(tournament);
  if (!tableLabels.length) {
    return [];
  }

  const matches = await matchRepository.findMany(
    {
      tournamentId: tournament._id,
      status: { $in: ['ready', 'ongoing'] },
    },
    {
      sort: { scheduledAt: 1, roundNumber: 1, matchNumber: 1 },
      limit: 2048,
    },
  );

  const occupiedTables = new Set(matches.filter((match) => match.tableNo).map((match) => match.tableNo));
  const readyWithoutTable = matches.filter((match) => match.status === 'ready' && !match.tableNo);
  const assignedMatches = [];

  if (options.preferredTableNo && tableLabels.includes(options.preferredTableNo) && !occupiedTables.has(options.preferredTableNo)) {
    const nextMatch = readyWithoutTable.shift();
    if (nextMatch) {
      nextMatch.tableNo = options.preferredTableNo;
      nextMatch.scheduledAt = nextMatch.scheduledAt || new Date();
      await nextMatch.save();
      assignedMatches.push(nextMatch);
      occupiedTables.add(options.preferredTableNo);
    }
  }

  const freeTables = tableLabels.filter((label) => !occupiedTables.has(label));
  for (const tableNo of freeTables) {
    const nextMatch = readyWithoutTable.shift();
    if (!nextMatch) {
      break;
    }

    nextMatch.tableNo = tableNo;
    nextMatch.scheduledAt = nextMatch.scheduledAt || new Date();
    await nextMatch.save();
    assignedMatches.push(nextMatch);
  }

  return assignedMatches;
}

module.exports = {
  buildTournamentTableLabels,
  assignReadyMatchesToTables,
};
