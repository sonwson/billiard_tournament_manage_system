const { mongoose } = require('../../config/db');

const AuthSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  refreshTokenHash: { type: String, required: true },
  userAgent: { type: String, default: null },
  ipAddress: { type: String, default: null },
  expiresAt: { type: Date, required: true, index: true },
  revokedAt: { type: Date, default: null },
}, {
  timestamps: true,
});

module.exports = mongoose.model('AuthSession', AuthSessionSchema);
