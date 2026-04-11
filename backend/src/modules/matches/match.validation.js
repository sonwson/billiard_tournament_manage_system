const { z } = require('zod');
const { SKILL_LEVELS } = require('../../common/constants/skillLevel');

const matchIdParamSchema = z.object({
  body: z.object({}).passthrough(),
  params: z.object({
    id: z.string().min(1),
  }),
  query: z.object({}).passthrough(),
});

const listMatchesByTournamentSchema = z.object({
  body: z.object({}).passthrough(),
  params: z.object({
    id: z.string().min(1),
  }),
  query: z.object({
    page: z.coerce.number().optional(),
    limit: z.coerce.number().optional(),
    roundNumber: z.coerce.number().optional(),
    skillLevel: z.enum(SKILL_LEVELS).optional(),
    status: z.enum(['scheduled', 'ready', 'ongoing', 'completed', 'cancelled']).optional(),
  }).passthrough(),
});

const scheduleMatchSchema = z.object({
  body: z.object({
    scheduledAt: z.coerce.date(),
    tableNo: z.string().optional().nullable(),
  }),
  params: z.object({
    id: z.string().min(1),
  }),
  query: z.object({}).passthrough(),
});

const updateMatchStatusSchema = z.object({
  body: z.object({
    status: z.enum(['scheduled', 'ready', 'ongoing', 'completed', 'cancelled']),
  }),
  params: z.object({
    id: z.string().min(1),
  }),
  query: z.object({}).passthrough(),
});

const updateLiveScoreSchema = z.object({
  body: z.object({
    player1Score: z.number().int().min(0),
    player2Score: z.number().int().min(0),
  }),
  params: z.object({
    id: z.string().min(1),
  }),
  query: z.object({}).passthrough(),
});

const updateMatchResultSchema = z.object({
  body: z.object({
    player1Score: z.number().int().min(0),
    player2Score: z.number().int().min(0),
    winnerPlayerId: z.string().min(1).optional(),
  }),
  params: z.object({
    id: z.string().min(1),
  }),
  query: z.object({}).passthrough(),
});

const generateScoreAccessSchema = z.object({
  body: z.object({}).passthrough(),
  params: z.object({
    id: z.string().min(1),
  }),
  query: z.object({}).passthrough(),
});

const publicTokenParamSchema = z.object({
  body: z.object({}).passthrough(),
  params: z.object({
    token: z.string().min(16),
  }),
  query: z.object({}).passthrough(),
});

const publicLiveScoreSchema = z.object({
  body: z.object({
    player1Score: z.number().int().min(0),
    player2Score: z.number().int().min(0),
  }),
  params: z.object({
    token: z.string().min(16),
  }),
  query: z.object({}).passthrough(),
});

const publicUpdateMatchResultSchema = z.object({
  body: z.object({
    player1Score: z.number().int().min(0),
    player2Score: z.number().int().min(0),
    winnerPlayerId: z.string().min(1).optional(),
  }),
  params: z.object({
    token: z.string().min(16),
  }),
  query: z.object({}).passthrough(),
});

module.exports = {
  matchIdParamSchema,
  listMatchesByTournamentSchema,
  scheduleMatchSchema,
  updateMatchStatusSchema,
  updateLiveScoreSchema,
  updateMatchResultSchema,
  generateScoreAccessSchema,
  publicTokenParamSchema,
  publicLiveScoreSchema,
  publicUpdateMatchResultSchema,
};
