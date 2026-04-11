const express = require('express');
const authMiddleware = require('../../middlewares/auth.middleware');
const requireRole = require('../../middlewares/role.middleware');
const validate = require('../../middlewares/validate.middleware');
const { ADMIN_ROLES, ROLES } = require('../../common/constants/roles');
const registrationController = require('./registration.controller');
const registrationValidation = require('./registration.validation');

const router = express.Router();

router.patch('/:id/review', authMiddleware, requireRole(...ADMIN_ROLES), validate(registrationValidation.reviewRegistrationSchema), registrationController.reviewRegistration);
router.patch('/:id/cancel', authMiddleware, requireRole(...ADMIN_ROLES, ROLES.USER), validate(registrationValidation.cancelRegistrationSchema), registrationController.cancelRegistration);

module.exports = router;
