const express = require('express');
const authMiddleware = require('../../middlewares/auth.middleware');
const requireRole = require('../../middlewares/role.middleware');
const validate = require('../../middlewares/validate.middleware');
const { ADMIN_ROLES, ROLES } = require('../../common/constants/roles');
const tournamentController = require('./tournament.controller');
const tournamentValidation = require('./tournament.validation');
const registrationController = require('../registrations/registration.controller');
const registrationValidation = require('../registrations/registration.validation');
const matchController = require('../matches/match.controller');
const matchValidation = require('../matches/match.validation');

const router = express.Router();

router.get('/', validate(tournamentValidation.listTournamentsSchema), tournamentController.listTournaments);
router.get('/open-registration', validate(tournamentValidation.listTournamentsSchema), tournamentController.listOpenRegistration);
router.get('/history', validate(tournamentValidation.listTournamentsSchema), tournamentController.listHistory);
router.get('/manageable/me', authMiddleware, requireRole(...ADMIN_ROLES), validate(tournamentValidation.listTournamentsSchema), tournamentController.listManageableTournaments);
router.get('/trash', authMiddleware, requireRole(ROLES.ADMIN, ROLES.SUPER_ADMIN), validate(tournamentValidation.listTournamentsSchema), tournamentController.listDeletedTournaments);
router.get('/:id', validate(tournamentValidation.tournamentIdParamSchema), tournamentController.getTournamentById);
router.get('/:id/registrations', authMiddleware, requireRole(...ADMIN_ROLES), validate(registrationValidation.listRegistrationsByTournamentSchema), registrationController.listByTournament);
router.get('/:id/matches', validate(matchValidation.listMatchesByTournamentSchema), matchController.listByTournament);
router.post('/:id/registrations', authMiddleware, requireRole(...ADMIN_ROLES, ROLES.USER), validate(registrationValidation.createRegistrationSchema), registrationController.createForTournament);
router.delete('/:id/players/:playerId', authMiddleware, requireRole(...ADMIN_ROLES), validate(registrationValidation.removeTournamentPlayerSchema), registrationController.removePlayerFromTournament);
router.post('/', authMiddleware, requireRole(...ADMIN_ROLES), validate(tournamentValidation.createTournamentSchema), tournamentController.createTournament);
router.patch('/:id', authMiddleware, requireRole(...ADMIN_ROLES), validate(tournamentValidation.updateTournamentSchema), tournamentController.updateTournament);
router.patch('/:id/status', authMiddleware, requireRole(...ADMIN_ROLES), validate(tournamentValidation.updateTournamentStatusSchema), tournamentController.updateTournamentStatus);
router.post('/:id/generate-bracket', authMiddleware, requireRole(...ADMIN_ROLES), validate(tournamentValidation.generateBracketSchema), tournamentController.generateBracket);
router.patch('/:id/restore', authMiddleware, requireRole(ROLES.ADMIN, ROLES.SUPER_ADMIN), validate(tournamentValidation.tournamentIdParamSchema), tournamentController.restoreTournament);
router.delete('/:id/permanent', authMiddleware, requireRole(ROLES.ADMIN, ROLES.SUPER_ADMIN), validate(tournamentValidation.tournamentIdParamSchema), tournamentController.deleteTournamentPermanently);
router.delete('/:id', authMiddleware, requireRole(...ADMIN_ROLES), validate(tournamentValidation.tournamentIdParamSchema), tournamentController.deleteTournament);

module.exports = router;
