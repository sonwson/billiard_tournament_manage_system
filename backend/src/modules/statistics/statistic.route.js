const express = require('express');
const authMiddleware = require('../../middlewares/auth.middleware');
const requireRole = require('../../middlewares/role.middleware');
const validate = require('../../middlewares/validate.middleware');
const { ADMIN_ROLES } = require('../../common/constants/roles');
const statisticController = require('./statistic.controller');
const statisticValidation = require('./statistic.validation');

const router = express.Router();

router.get('/dashboard', authMiddleware, requireRole(...ADMIN_ROLES), validate(statisticValidation.dashboardSchema), statisticController.getDashboard);
router.get('/tournaments/:id', authMiddleware, requireRole(...ADMIN_ROLES), validate(statisticValidation.detailSchema), statisticController.getTournamentStatistics);
router.get('/players/:id', authMiddleware, requireRole(...ADMIN_ROLES), validate(statisticValidation.detailSchema), statisticController.getPlayerStatistics);

module.exports = router;
