const express = require('express');
const authMiddleware = require('../../middlewares/auth.middleware');
const requireRole = require('../../middlewares/role.middleware');
const validate = require('../../middlewares/validate.middleware');
const { ADMIN_ROLES } = require('../../common/constants/roles');
const userController = require('./user.controller');
const userValidation = require('./user.validation');

const router = express.Router();

router.patch('/me/password', authMiddleware, validate(userValidation.changePasswordSchema), userController.changePassword);
router.get('/me/matches', authMiddleware, validate(userValidation.listMyMatchesSchema), userController.listMyMatches);
router.patch('/me', authMiddleware, validate(userValidation.updateMeSchema), userController.updateMe);
router.post('/me/request-tournament-admin', authMiddleware, validate(userValidation.requestTournamentAdminSchema), userController.requestTournamentAdmin);
router.get('/tournament-admin-requests', authMiddleware, requireRole(...ADMIN_ROLES), validate(userValidation.listTournamentAdminRequestsSchema), userController.listTournamentAdminRequests);
router.patch('/:id/tournament-admin-request/review', authMiddleware, requireRole(...ADMIN_ROLES), validate(userValidation.reviewTournamentAdminRequestSchema), userController.reviewTournamentAdminRequest);
router.post('/:id/downgrade-tournament-admin', authMiddleware, requireRole(ADMIN_ROLES[0], ADMIN_ROLES[1]), userController.downgradeTournamentAdmin);
router.get('/', authMiddleware, requireRole(...ADMIN_ROLES), validate(userValidation.listUsersSchema), userController.listUsers);
router.get('/:id', authMiddleware, requireRole(...ADMIN_ROLES), validate(userValidation.userIdParamSchema), userController.getUserById);
router.patch('/:id', authMiddleware, requireRole(...ADMIN_ROLES), validate(userValidation.updateUserSchema), userController.updateUser);

module.exports = router;
