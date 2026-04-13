const { mongoose } = require('../../config/db');
const { createAuditFields } = require('../../common/utils/auditFields');
const { SKILL_LEVELS } = require('../../common/constants/skillLevel');

const PrizeSchema = new mongoose.Schema({
  position: { type: Number, required: true },
  label: { type: String, required: true },
  rewardType: { type: String, enum: ['cash', 'gift', 'point'], default: 'cash' },
  payoutCount: { type: Number, default: 1, min: 1 },
  amount: { type: Number, default: 0 },
  note: { type: String, default: '' },
}, { _id: false });

const RaceToRuleSchema = new mongoose.Schema({
  roundNumber: { type: Number, required: true, min: 1 },
  raceTo: { type: Number, required: true, min: 1 },
}, { _id: false });

const BracketSettingsSchema = new mongoose.Schema({
  knockoutStartSize: { type: Number, enum: [128, 64, 32, 16, 8], default: null },
}, { _id: false });

const TableAccessSchema = new mongoose.Schema({
  tableNo: { type: String, required: true },
  tokenHash: { type: String, default: null, select: false },
  enabledAt: { type: Date, default: null },
  lastUsedAt: { type: Date, default: null },
}, { _id: false });

const TournamentSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  slug: { type: String, required: true, unique: true },
  name: { type: String, required: true, trim: true, index: true },
  description: { type: String, default: '' },
  image: { type: String, default: null },
  gameType: { type: String, enum: ['pool_8', 'pool_9', 'pool_10', 'carom', 'snooker'], required: true },
  format: { type: String, enum: ['single_elimination', 'double_elimination', 'round_robin', 'group_knockout'], default: 'single_elimination' },
  eventType: { type: String, enum: ['ranking', 'open', 'invitational', 'qualifier'], default: 'ranking', index: true },
  tier: { type: String, enum: ['local', 'monthly', 'major'], default: 'local', index: true },
  venue: {
    name: { type: String, required: true },
    address: { type: String, default: '' },
    city: { type: String, default: '' },
  },
  entryFee: { type: Number, default: 0, min: 0 },
  prizeFund: { type: Number, default: 0, min: 0 },
  prizeStructure: { type: [PrizeSchema], default: [] },
  raceToRules: { type: [RaceToRuleSchema], default: [] },
  bracketSettings: { type: BracketSettingsSchema, default: () => ({}) },
  tableCount: { type: Number, default: 0, min: 0 },
  tvTableCount: { type: Number, default: 0, min: 0 },
  tableAccess: { type: [TableAccessSchema], default: [] },
  maxPlayers: { type: Number, required: true, min: 2 },
  approvedPlayerCount: { type: Number, default: 0 },
  registrationOpenAt: { type: Date, required: true },
  registrationCloseAt: { type: Date, required: true },
  startAt: { type: Date, required: true, index: true },
  endAt: { type: Date, default: null },
  status: { type: String, enum: ['draft', 'open_registration', 'closed_registration', 'ongoing', 'finished'], default: 'draft', index: true },
  bracketGeneratedAt: { type: Date, default: null },
  championPlayerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },
  ownerAdminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  managerAdminIds: { type: [mongoose.Schema.Types.ObjectId], ref: 'User', default: [] },
  championsBySkillLevel: {
    type: [{
      skillLevel: { type: String, enum: SKILL_LEVELS, required: true },
      playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
    }],
    default: [],
  },
  ...createAuditFields(),
}, {
  timestamps: true,
});

TournamentSchema.index({ status: 1, registrationOpenAt: 1 });
TournamentSchema.index({ status: 1, startAt: 1 });

module.exports = mongoose.model('Tournament', TournamentSchema);

