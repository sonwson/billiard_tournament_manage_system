const { z } = require('zod');
const { SKILL_LEVELS } = require('../../common/constants/skillLevel');

const createRegistrationSchema = z.object({
  body: z.object({
    playerId: z.string().optional(),
    skillLevel: z.enum(SKILL_LEVELS),
  }),
  params: z.object({
    id: z.string().min(1),
  }),
  query: z.object({}).passthrough(),
});

const listRegistrationsByTournamentSchema = z.object({
  body: z.object({}).passthrough(),
  params: z.object({
    id: z.string().min(1),
  }),
  query: z.object({
    page: z.coerce.number().optional(),
    limit: z.coerce.number().optional(),
    status: z.enum(['pending', 'approved', 'rejected', 'cancelled']).optional(),
  }).passthrough(),
});

const reviewRegistrationSchema = z.object({
  body: z.object({
    action: z.enum(['approve', 'reject']),
    rejectionReason: z.string().optional(),
  }),
  params: z.object({
    id: z.string().min(1),
  }),
  query: z.object({}).passthrough(),
});

const cancelRegistrationSchema = z.object({
  body: z.object({}).passthrough(),
  params: z.object({
    id: z.string().min(1),
  }),
  query: z.object({}).passthrough(),
});

const removeTournamentPlayerSchema = z.object({
  body: z.object({}).passthrough(),
  params: z.object({
    id: z.string().min(1),
    playerId: z.string().min(1),
  }),
  query: z.object({}).passthrough(),
});

module.exports = {
  createRegistrationSchema,
  listRegistrationsByTournamentSchema,
  reviewRegistrationSchema,
  cancelRegistrationSchema,
  removeTournamentPlayerSchema,
};
