const { mongoose } = require('../../config/db');
const { createAuditFields } = require('../../common/utils/auditFields');
const { SKILL_LEVELS } = require('../../common/constants/skillLevel');

const RegistrationSchema = new mongoose.Schema({
  tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true, index: true },
  playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  skillLevel: { type: String, enum: SKILL_LEVELS, default: null, index: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'cancelled'], default: 'pending', index: true },
  registeredAt: { type: Date, default: Date.now, index: true },
  reviewedAt: { type: Date, default: null },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  rejectionReason: { type: String, default: null },
  seedingNumber: { type: Number, default: null, index: true },
  snapshot: {
    displayName: { type: String, required: true },
    club: { type: String, default: null },
    rankingPoints: { type: Number, default: 0 },
  },
  stats: {
    matchesPlayed: { type: Number, default: 0 },
    matchesWon: { type: Number, default: 0 },
    finalPosition: { type: Number, default: null },
    eliminatedRound: { type: String, default: null },
    pointsAwarded: { type: Number, default: 0 },
  },
  ...createAuditFields(),
}, {
  timestamps: true,
});

RegistrationSchema.index({ tournamentId: 1, playerId: 1 }, { unique: true });
RegistrationSchema.index({ tournamentId: 1, skillLevel: 1, status: 1 });

module.exports = mongoose.model('Registration', RegistrationSchema);
