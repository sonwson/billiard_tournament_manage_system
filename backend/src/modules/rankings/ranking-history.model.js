const { mongoose } = require('../../config/db');

const RankingHistorySchema = new mongoose.Schema({
  playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true, index: true },
  seasonKey: { type: String, default: 'all_time', index: true },
  tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', default: null, index: true },
  matchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', default: null, index: true },
  sourceType: {
    type: String,
    enum: ['participation', 'match_win', 'top8', 'top4', 'runner_up', 'champion', 'manual_adjustment', 'reversal'],
    required: true,
  },
  sourceKey: { type: String, required: true },
  pointsDelta: { type: Number, required: true },
  pointsBefore: { type: Number, required: true },
  pointsAfter: { type: Number, required: true },
  note: { type: String, default: '' },
  effectiveAt: { type: Date, default: Date.now, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, {
  timestamps: true,
});

RankingHistorySchema.index({ playerId: 1, sourceKey: 1 }, { unique: true });

module.exports = mongoose.model('RankingHistory', RankingHistorySchema);
