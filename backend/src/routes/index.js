const express = require('express');
const authRoutes = require('../modules/auth/auth.route');
const userRoutes = require('../modules/users/user.route');
const playerRoutes = require('../modules/players/player.route');
const tournamentRoutes = require('../modules/tournaments/tournament.route');
const registrationRoutes = require('../modules/registrations/registration.route');
const matchRoutes = require('../modules/matches/match.route');
const rankingRoutes = require('../modules/rankings/ranking.route');
const statisticRoutes = require('../modules/statistics/statistic.route');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/players', playerRoutes);
router.use('/tournaments', tournamentRoutes);
router.use('/registrations', registrationRoutes);
router.use('/matches', matchRoutes);
router.use('/rankings', rankingRoutes);
router.use('/statistics', statisticRoutes);

module.exports = router;
