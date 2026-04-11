const { mongoose } = require('../../config/db');
const { createAuditFields } = require('../../common/utils/auditFields');
const { ROLES } = require('../../common/constants/roles');

const UserSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true, maxlength: 120 },
  email: { type: String, trim: true, lowercase: true, default: null, unique: true, sparse: true },
  phone: { type: String, trim: true, default: null, unique: true, sparse: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: [ROLES.USER, ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.TOURNAMENT_ADMIN], default: ROLES.USER, index: true },
  status: { type: String, enum: ['active', 'inactive', 'blocked'], default: 'active', index: true },
  managedTournamentIds: { type: [mongoose.Schema.Types.ObjectId], ref: 'Tournament', default: [] },
  tournamentAdminRequest: {
    status: { type: String, enum: ['none', 'pending', 'approved', 'rejected'], default: 'none' },
    note: { type: String, default: '' },
    requestedAt: { type: Date, default: null },
    reviewedAt: { type: Date, default: null },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  passwordReset: {
    codeHash: { type: String, default: null, select: false },
    expiresAt: { type: Date, default: null },
    requestedAt: { type: Date, default: null },
    deliveredTo: { type: String, default: null },
  },
  lastLoginAt: { type: Date, default: null },
  refreshTokenVersion: { type: Number, default: 0 },
  ...createAuditFields(),
}, {
  timestamps: true,
});

module.exports = mongoose.model('User', UserSchema);
