const { mongoose } = require('../../config/db');
const { createAuditFields } = require('../../common/utils/auditFields');

const RankingSchema = new mongoose.Schema({
  playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true, index: true },
  seasonKey: { type: String, default: 'all_time', index: true },
  totalPoints: { type: Number, default: 0, index: true },
  currentRank: { type: Number, default: null, index: true },
  tournamentsPlayed: { type: Number, default: 0 },
  matchesPlayed: { type: Number, default: 0 },
  matchesWon: { type: Number, default: 0 },
  championships: { type: Number, default: 0 },
  runnerUps: { type: Number, default: 0 },
  top4Count: { type: Number, default: 0 },
  top8Count: { type: Number, default: 0 },
  lastTournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', default: null },
  lastCalculatedAt: { type: Date, default: Date.now },
  ...createAuditFields(),
}, {
  timestamps: true,
});

RankingSchema.index({ playerId: 1, seasonKey: 1 }, { unique: true });

module.exports = mongoose.model('Ranking', RankingSchema);
