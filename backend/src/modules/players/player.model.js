const { mongoose } = require('../../config/db');
const { createAuditFields } = require('../../common/utils/auditFields');

const PlayerSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  playerCode: { type: String, required: true, unique: true },
  displayName: { type: String, required: true, trim: true, index: true },
  email: { type: String, trim: true, lowercase: true, default: null, sparse: true, index: true },
  phone: { type: String, trim: true, default: null, sparse: true, index: true },
  avatarUrl: { type: String, default: null },
  dateOfBirth: { type: Date, default: null },
  gender: { type: String, enum: ['male', 'female', 'other'], default: null },
  club: { type: String, trim: true, default: null, index: true },
  city: { type: String, trim: true, default: null, index: true },
  skillLevel: { type: String, enum: ['beginner', 'intermediate', 'advanced', 'pro'], default: 'beginner' },
  status: { type: String, enum: ['active', 'inactive', 'banned'], default: 'active', index: true },
  stats: {
    tournamentsPlayed: { type: Number, default: 0 },
    matchesPlayed: { type: Number, default: 0 },
    matchesWon: { type: Number, default: 0 },
    championships: { type: Number, default: 0 },
    runnerUps: { type: Number, default: 0 },
    rankingPoints: { type: Number, default: 0, index: true },
    winRate: { type: Number, default: 0 },
  },
  ...createAuditFields(),
}, {
  timestamps: true,
});

PlayerSchema.index(
  { userId: 1 },
  {
    unique: true,
    partialFilterExpression: { userId: { $type: 'objectId' } },
  },
);

module.exports = mongoose.model('Player', PlayerSchema);
