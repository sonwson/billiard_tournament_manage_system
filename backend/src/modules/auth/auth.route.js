const express = require('express');
const validate = require('../../middlewares/validate.middleware');
const authMiddleware = require('../../middlewares/auth.middleware');
const { authRateLimit } = require('../../middlewares/rateLimit.middleware');
const authController = require('./auth.controller');
const authValidation = require('./auth.validation');

const router = express.Router();

router.post('/register', authRateLimit, validate(authValidation.registerSchema), authController.register);
router.post('/login', authRateLimit, validate(authValidation.loginSchema), authController.login);
router.post('/forgot-password', authRateLimit, validate(authValidation.forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', authRateLimit, validate(authValidation.resetPasswordSchema), authController.resetPassword);
router.post('/refresh', validate(authValidation.refreshSchema), authController.refresh);
router.post('/logout', authMiddleware, validate(authValidation.logoutSchema), authController.logout);
router.get('/me', authMiddleware, authController.me);

module.exports = router;
