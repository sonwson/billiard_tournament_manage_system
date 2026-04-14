const express = require('express');
const authMiddleware = require('../../middlewares/auth.middleware');
const requireRole = require('../../middlewares/role.middleware');
const validate = require('../../middlewares/validate.middleware');
const { ADMIN_ROLES, ROLES } = require('../../common/constants/roles');
const playerController = require('./player.controller');
const playerValidation = require('./player.validation');

const router = express.Router();

router.get('/', validate(playerValidation.listPlayersSchema), playerController.listPlayers);
router.get('/manageable', authMiddleware, requireRole(...ADMIN_ROLES), validate(playerValidation.listPlayersSchema), playerController.listManageablePlayers);
router.post('/bulk', authMiddleware, requireRole(...ADMIN_ROLES), validate(playerValidation.bulkCreatePlayersSchema), playerController.bulkCreatePlayers);
router.patch('/me', authMiddleware, validate(playerValidation.updateMyPlayerSchema), playerController.updateMyPlayer);
router.delete('/:id', authMiddleware, requireRole(...ADMIN_ROLES), validate(playerValidation.deletePlayerSchema), playerController.deletePlayerPermanently);
router.get('/:id', validate(playerValidation.playerIdParamSchema), playerController.getPlayerById);
router.post('/', authMiddleware, requireRole(...ADMIN_ROLES, ROLES.USER), validate(playerValidation.createPlayerSchema), playerController.createPlayer);
router.patch('/:id', authMiddleware, requireRole(...ADMIN_ROLES, ROLES.USER), validate(playerValidation.updatePlayerSchema), playerController.updatePlayer);

module.exports = router;
