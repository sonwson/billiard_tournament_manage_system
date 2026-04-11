const TOURNAMENT_STATUS = {
  DRAFT: 'draft',
  OPEN_REGISTRATION: 'open_registration',
  CLOSED_REGISTRATION: 'closed_registration',
  ONGOING: 'ongoing',
  FINISHED: 'finished',
};

const TOURNAMENT_FORMAT = {
  SINGLE_ELIMINATION: 'single_elimination',
  DOUBLE_ELIMINATION: 'double_elimination',
  ROUND_ROBIN: 'round_robin',
  GROUP_KNOCKOUT: 'group_knockout',
};

const TOURNAMENT_TIER = {
  LOCAL: 'local',
  MONTHLY: 'monthly',
  MAJOR: 'major',
};

const TOURNAMENT_EVENT_TYPE = {
  RANKING: 'ranking',
  OPEN: 'open',
  INVITATIONAL: 'invitational',
  QUALIFIER: 'qualifier',
};

module.exports = {
  TOURNAMENT_STATUS,
  TOURNAMENT_FORMAT,
  TOURNAMENT_TIER,
  TOURNAMENT_EVENT_TYPE,
};
