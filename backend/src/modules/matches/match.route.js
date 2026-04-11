const express = require('express');
const authMiddleware = require('../../middlewares/auth.middleware');
const requireRole = require('../../middlewares/role.middleware');
const validate = require('../../middlewares/validate.middleware');
const { ADMIN_ROLES } = require('../../common/constants/roles');
const matchController = require('./match.controller');
const matchValidation = require('./match.validation');

const router = express.Router();

router.get('/public/:token', validate(matchValidation.publicTokenParamSchema), matchController.getPublicScoreMatch);
router.patch('/public/:token/score', validate(matchValidation.publicLiveScoreSchema), matchController.updatePublicLiveScore);
router.patch('/public/:token/result', validate(matchValidation.publicUpdateMatchResultSchema), matchController.updatePublicMatchResult);
router.get('/:id', validate(matchValidation.matchIdParamSchema), matchController.getMatchById);
router.post('/:id/score-access', authMiddleware, requireRole(...ADMIN_ROLES), validate(matchValidation.generateScoreAccessSchema), matchController.generateScoreAccess);
router.patch('/:id/schedule', authMiddleware, requireRole(...ADMIN_ROLES), validate(matchValidation.scheduleMatchSchema), matchController.scheduleMatch);
router.patch('/:id/status', authMiddleware, requireRole(...ADMIN_ROLES), validate(matchValidation.updateMatchStatusSchema), matchController.updateMatchStatus);
router.patch('/:id/score', authMiddleware, requireRole(...ADMIN_ROLES), validate(matchValidation.updateLiveScoreSchema), matchController.updateLiveScore);
router.patch('/:id/result', authMiddleware, requireRole(...ADMIN_ROLES), validate(matchValidation.updateMatchResultSchema), matchController.updateMatchResult);

module.exports = router;
