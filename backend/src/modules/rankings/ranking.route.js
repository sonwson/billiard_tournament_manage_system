const express = require('express');
const authMiddleware = require('../../middlewares/auth.middleware');
const requireRole = require('../../middlewares/role.middleware');
const validate = require('../../middlewares/validate.middleware');
const { ADMIN_ROLES } = require('../../common/constants/roles');
const rankingController = require('./ranking.controller');
const rankingValidation = require('./ranking.validation');

const router = express.Router();

router.get('/', validate(rankingValidation.listRankingsSchema), rankingController.listRankings);
router.get('/history', validate(rankingValidation.rankingHistorySchema), rankingController.getRankingHistory);
router.get('/:playerId', validate(rankingValidation.rankingDetailSchema), rankingController.getRankingDetail);
router.post('/recalculate', authMiddleware, requireRole(...ADMIN_ROLES), rankingController.recalculateRankings);
router.post('/reset', authMiddleware, requireRole(...ADMIN_ROLES), rankingController.resetRankings);
router.post('/:playerId/rollback', authMiddleware, requireRole(...ADMIN_ROLES), rankingController.rollbackPointChange);

module.exports = router;
